/**
 * @module create-journey-item
 * @capability CreateJourneyItem command handler
 * @layer Orchestration
 *
 * Adds a new item to a property's design renovation journey (action plan)
 * after verifying ownership of the parent property.
 *
 * @see packages/shared/src/manifests/commands.ts — CreateJourneyItem
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbDesignJourneyItem, Priority, JourneyItemCreatedEvent } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface CreateJourneyItemInput {
  propertyId: string;
  priority: number;
  title: string;
  description?: string;
  estimated_cost?: string;
  impact: Priority;
  rooms_affected: string[];
}

export async function createJourneyItem(
  input: CreateJourneyItemInput,
  ctx: CommandContext,
): Promise<CommandResult<DbDesignJourneyItem>> {
  const { propertyId, ...itemFields } = input;

  // Verify ownership
  const property = await propertyRepo.findByIdWithColumns(propertyId, ctx.userId, "id");
  if (!property) {
    throw PlatformError.notFound("Property", propertyId);
  }

  const data = await journeyRepo.create({
    ...itemFields,
    property_id: propertyId,
    user_id: ctx.userId,
  });

  const events: JourneyItemCreatedEvent[] = [
    {
      type: "JourneyItemCreated",
      entityId: data.id,
      entityType: "JourneyItem",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { journeyItemId: data.id, propertyId, userId: ctx.userId, priority: input.priority },
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
        params: { propertyId },
      },
      {
        label: "Update Item",
        command: "UpdateJourneyItem",
        params: { journeyItemId: data.id },
      },
    ],
  };
}
