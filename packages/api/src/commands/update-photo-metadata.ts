/**
 * @module update-photo-metadata
 * @capability UpdatePhotoMetadata command handler
 * @layer Orchestration
 *
 * Updates a photo's display name, description, tags, or constraints
 * after verifying the caller owns the photo.
 *
 * @see packages/shared/src/manifests/commands.ts — UpdatePhotoMetadata
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbPhoto, PhotoUpdatedEvent } from "@str-renovator/shared";
import * as photoRepo from "../repositories/photo.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface UpdatePhotoMetadataInput {
  photoId: string;
  display_name?: string;
  description?: string;
  tags?: string[];
  constraints?: string[];
}

export async function updatePhotoMetadata(
  input: UpdatePhotoMetadataInput,
  ctx: CommandContext,
): Promise<CommandResult<DbPhoto>> {
  const { photoId, ...fields } = input;

  const photo = await photoRepo.findByIdAndUser(photoId, ctx.userId);
  if (!photo) {
    throw PlatformError.notFound("Photo", photoId);
  }

  const updates: Record<string, unknown> = {};
  if (fields.display_name !== undefined) updates.display_name = fields.display_name;
  if (fields.description !== undefined) updates.description = fields.description;
  if (fields.tags !== undefined) updates.tags = fields.tags;
  if (fields.constraints !== undefined) updates.constraints = fields.constraints;

  if (Object.keys(updates).length === 0) {
    throw PlatformError.validationError("No fields to update");
  }

  const updated = await photoRepo.update(photoId, updates);

  const events: PhotoUpdatedEvent[] = [
    {
      type: "PhotoUpdated",
      entityId: photoId,
      entityType: "Photo",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { photoId, userId: ctx.userId, updatedFields: Object.keys(updates) },
    },
  ];
  await publishEvents(events);

  return {
    data: updated,
    events,
    availableActions: [
      {
        label: "View Photo",
        command: "GetPhoto",
        params: { photoId },
      },
    ],
  };
}
