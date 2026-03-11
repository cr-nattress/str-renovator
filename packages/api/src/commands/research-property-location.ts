/**
 * @module research-property-location
 * @capability ResearchPropertyLocation command handler
 * @layer Orchestration
 *
 * Starts background AI research on a property's location. Requires that
 * the property has at least a city or state on record.
 *
 * @see packages/shared/src/manifests/commands.ts — ResearchPropertyLocation
 */

import { PlatformError } from "@str-renovator/shared";
import type { LocationResearchSubmittedEvent } from "@str-renovator/shared";
import { enqueueLocationResearch } from "../services/queue.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface ResearchPropertyLocationInput {
  propertyId: string;
}

export async function researchPropertyLocation(
  input: ResearchPropertyLocationInput,
  ctx: CommandContext,
): Promise<CommandResult<{ status: string }>> {
  const { propertyId } = input;

  // Verify ownership and check city/state
  const property = await propertyRepo.findByIdWithColumns(propertyId, ctx.userId, "id, city, state");
  if (!property) {
    throw PlatformError.notFound("Property", propertyId);
  }

  if (!property.city && !property.state) {
    throw PlatformError.validationError("Property must have a city or state to research location");
  }

  await enqueueLocationResearch(propertyId, ctx.userId);

  const events: LocationResearchSubmittedEvent[] = [
    {
      type: "LocationResearchSubmitted",
      entityId: propertyId,
      entityType: "Property",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { propertyId, userId: ctx.userId },
    },
  ];
  await publishEvents(events);

  return {
    data: { status: "queued" },
    events,
    availableActions: [
      {
        label: "View Property",
        command: "GetProperty",
        params: { propertyId },
      },
    ],
  };
}
