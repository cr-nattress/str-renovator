/**
 * @module delete-property
 * @capability DeleteProperty command handler
 * @layer Orchestration
 *
 * Permanently deletes a property. The repository handles cascade removal
 * of associated photos, analyses, and renovations.
 *
 * @see packages/shared/src/manifests/commands.ts — DeleteProperty
 */

import type { PropertyDeletedEvent } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export async function deleteProperty(
  input: { propertyId: string },
  ctx: CommandContext,
): Promise<CommandResult<null>> {
  await propertyRepo.remove(input.propertyId, ctx.userId);

  const events: PropertyDeletedEvent[] = [
    {
      type: "PropertyDeleted",
      entityId: input.propertyId,
      entityType: "Property",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { propertyId: input.propertyId, userId: ctx.userId },
    },
  ];
  await publishEvents(events);

  return {
    data: null,
    events,
    availableActions: [
      {
        label: "View Properties",
        command: "ListProperties",
      },
    ],
  };
}
