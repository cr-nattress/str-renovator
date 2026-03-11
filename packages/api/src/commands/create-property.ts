/**
 * @module create-property
 * @capability CreateProperty command handler
 * @layer Orchestration
 *
 * Creates a new STR property for the authenticated user after verifying
 * the tier-based property count limit.
 *
 * @see packages/shared/src/manifests/commands.ts — CreateProperty
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { DbProperty, PropertyCreatedEvent } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface CreatePropertyInput {
  name: string;
  description?: string;
  listing_url?: string;
  context?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export async function createProperty(
  input: CreatePropertyInput,
  ctx: CommandContext,
): Promise<CommandResult<DbProperty>> {
  const count = await propertyRepo.countByUser(ctx.userId);

  const limit = ctx.tierLimit ?? TIER_LIMITS[ctx.user.tier].properties;
  if (count >= limit) {
    throw PlatformError.tierLimitReached("properties", limit);
  }

  const data = await propertyRepo.create({ ...input, user_id: ctx.userId });

  const events: PropertyCreatedEvent[] = [
    {
      type: "PropertyCreated",
      entityId: data.id,
      entityType: "Property",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { propertyId: data.id, userId: ctx.userId, name: data.name },
    },
  ];
  await publishEvents(events);

  return {
    data,
    events,
    availableActions: [
      {
        label: "Upload Photos",
        command: "UploadPhotos",
        params: { propertyId: data.id },
      },
      {
        label: "Import from Listing URL",
        command: "ScrapePropertyListing",
        params: { propertyId: data.id },
      },
    ],
  };
}
