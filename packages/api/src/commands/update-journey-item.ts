/**
 * @module update-journey-item
 * @capability UpdateJourneyItem command handler
 * @layer Orchestration
 *
 * Updates a journey item's status, actual cost, or notes. The repository
 * enforces ownership by filtering on user_id.
 *
 * @see packages/shared/src/manifests/commands.ts — UpdateJourneyItem
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbDesignJourneyItem, JourneyStatus, JourneyItemUpdatedEvent } from "@str-renovator/shared";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import * as editHistoryRepo from "../repositories/edit-history.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface UpdateJourneyItemInput {
  journeyItemId: string;
  status?: JourneyStatus;
  actual_cost?: number;
  notes?: string;
}

export async function updateJourneyItem(
  input: UpdateJourneyItemInput,
  ctx: CommandContext,
): Promise<CommandResult<DbDesignJourneyItem>> {
  const { journeyItemId, ...fields } = input;

  // Snapshot current values for edit history
  const current = await journeyRepo.findByIdAndUser(journeyItemId, ctx.userId);

  const data = await journeyRepo.update(journeyItemId, ctx.userId, fields);
  if (!data) {
    throw PlatformError.notFound("Journey item", journeyItemId);
  }

  // Record edit history for tracked fields
  const trackableFields = ["title", "description", "estimated_cost", "actual_cost", "notes"];
  for (const key of Object.keys(fields)) {
    if (trackableFields.includes(key)) {
      const previousValue = current ? (current as unknown as Record<string, unknown>)[key] : null;
      await editHistoryRepo.create({
        entity_type: "JourneyItem",
        entity_id: journeyItemId,
        field_path: key,
        previous_value: previousValue ?? null,
        new_value: (fields as Record<string, unknown>)[key] ?? null,
        edited_by: ctx.userId,
        source: "user",
      }).catch(() => { /* edit history is additive — don't fail the update */ });
    }
  }

  const updatedFields = Object.keys(fields);
  const events: JourneyItemUpdatedEvent[] = [
    {
      type: "JourneyItemUpdated",
      entityId: journeyItemId,
      entityType: "JourneyItem",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { journeyItemId, userId: ctx.userId, updatedFields },
    },
  ];
  await publishEvents(events);

  return {
    data,
    events,
    availableActions: [
      {
        label: "View Journey",
        command: "ListJourneyItems",
        params: { propertyId: data.property_id },
      },
    ],
  };
}
