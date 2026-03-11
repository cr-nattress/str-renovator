/**
 * @module update-property
 * @capability UpdateProperty command handler
 * @layer Orchestration
 *
 * Updates an existing property's metadata. The repository enforces
 * ownership by filtering on user_id, returning null when the caller
 * does not own the target entity.
 *
 * @see packages/shared/src/manifests/commands.ts — UpdateProperty
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbProperty, PropertyUpdatedEvent } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import * as editHistoryRepo from "../repositories/edit-history.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface UpdatePropertyInput {
  propertyId: string;
  name?: string;
  description?: string;
  listing_url?: string;
  context?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  scraped_data?: Record<string, unknown>;
  location_profile?: Record<string, unknown>;
  property_profile?: Record<string, unknown>;
  review_analysis?: Record<string, unknown>;
}

/** JSONB fields that may contain AI-generated content worth tracking */
const TRACKABLE_JSONB_FIELDS = new Set([
  "scraped_data",
  "location_profile",
  "property_profile",
  "review_analysis",
]);

export async function updateProperty(
  input: UpdatePropertyInput,
  ctx: CommandContext,
): Promise<CommandResult<DbProperty>> {
  const { propertyId, ...fields } = input;

  // Snapshot current values for trackable fields before update
  const trackableKeys = Object.keys(fields).filter((k) => TRACKABLE_JSONB_FIELDS.has(k));
  let previousValues: Record<string, unknown> = {};
  if (trackableKeys.length > 0) {
    const current = await propertyRepo.findByIdAndUser(propertyId, ctx.userId);
    if (current) {
      for (const key of trackableKeys) {
        previousValues[key] = (current as unknown as Record<string, unknown>)[key];
      }
    }
  }

  const data = await propertyRepo.update(propertyId, ctx.userId, fields);

  if (!data) {
    throw PlatformError.notFound("Property", propertyId);
  }

  // Record edit history for trackable JSONB fields
  for (const key of trackableKeys) {
    await editHistoryRepo.create({
      entity_type: "Property",
      entity_id: propertyId,
      field_path: key,
      previous_value: previousValues[key] ?? null,
      new_value: (fields as Record<string, unknown>)[key] ?? null,
      edited_by: ctx.userId,
      source: "user",
    }).catch(() => { /* edit history is additive — don't fail the update */ });
  }

  const events: PropertyUpdatedEvent[] = [
    {
      type: "PropertyUpdated",
      entityId: data.id,
      entityType: "Property",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { propertyId: data.id, userId: ctx.userId, updatedFields: Object.keys(fields) },
    },
  ];
  await publishEvents(events);

  return {
    data,
    events,
    availableActions: [
      {
        label: "View Property",
        command: "GetProperty",
        params: { propertyId: data.id },
      },
    ],
  };
}
