/**
 * @module delete-photo
 * @capability DeletePhoto command handler
 * @layer Orchestration
 *
 * Deletes a photo from storage and the database after verifying ownership.
 *
 * @see packages/shared/src/manifests/commands.ts — DeletePhoto
 */

import { PlatformError } from "@str-renovator/shared";
import type { PhotoDeletedEvent } from "@str-renovator/shared";
import * as photoRepo from "../repositories/photo.repository.js";
import * as storageService from "../services/storage.service.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export async function deletePhoto(
  input: { photoId: string },
  ctx: CommandContext,
): Promise<CommandResult<null>> {
  const photo = await photoRepo.findByIdAndUser(input.photoId, ctx.userId);
  if (!photo) {
    throw PlatformError.notFound("Photo", input.photoId);
  }

  await storageService.deletePhoto(photo.storage_path);
  await photoRepo.remove(input.photoId);

  const events: PhotoDeletedEvent[] = [
    {
      type: "PhotoDeleted",
      entityId: input.photoId,
      entityType: "Photo",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { photoId: input.photoId, userId: ctx.userId, propertyId: photo.property_id },
    },
  ];
  await publishEvents(events);

  return {
    data: null,
    events,
    availableActions: [
      {
        label: "Upload Photos",
        command: "UploadPhotos",
        params: { propertyId: photo.property_id },
      },
    ],
  };
}
