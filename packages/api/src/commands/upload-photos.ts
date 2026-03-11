/**
 * @module upload-photos
 * @capability UploadPhotos command handler
 * @layer Orchestration
 *
 * Uploads one or more listing photos for a property after verifying
 * ownership and the per-property photo count tier limit.
 *
 * Does NOT handle multipart parsing — the route layer uses multer to
 * extract file buffers before calling this command.
 *
 * @see packages/shared/src/manifests/commands.ts — UploadPhotos
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { DbPhoto, PhotoUploadedEvent } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";
import * as storageService from "../services/storage.service.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface UploadPhotosInput {
  propertyId: string;
  files: Array<{
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }>;
}

export async function uploadPhotos(
  input: UploadPhotosInput,
  ctx: CommandContext,
): Promise<CommandResult<DbPhoto[]>> {
  const { propertyId, files } = input;

  // Verify property ownership
  const property = await propertyRepo.findByIdWithColumns(propertyId, ctx.userId, "id");
  if (!property) {
    throw PlatformError.notFound("Property", propertyId);
  }

  if (!files || files.length === 0) {
    throw PlatformError.validationError("No photos provided");
  }

  // Check photo count limit
  const count = await photoRepo.countByProperty(propertyId);
  const limit = ctx.tierLimit ?? TIER_LIMITS[ctx.user.tier].photosPerProperty;
  if (count + files.length > limit) {
    throw PlatformError.tierLimitReached("photos per property", limit);
  }

  // Upload each file
  const insertedPhotos: DbPhoto[] = [];
  for (const file of files) {
    const storagePath = await storageService.uploadPhoto(
      file.buffer,
      ctx.userId,
      propertyId,
      file.originalname,
      file.mimetype,
    );

    const photo = await photoRepo.create({
      property_id: propertyId,
      user_id: ctx.userId,
      filename: file.originalname,
      storage_path: storagePath,
      mime_type: file.mimetype,
      source: "upload",
    });

    insertedPhotos.push(photo);
  }

  const events: PhotoUploadedEvent[] = [
    {
      type: "PhotoUploaded",
      entityId: insertedPhotos[0].id,
      entityType: "Photo",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: {
        propertyId,
        userId: ctx.userId,
        photoIds: insertedPhotos.map((p) => p.id),
        count: insertedPhotos.length,
      },
    },
  ];
  await publishEvents(events);

  return {
    data: insertedPhotos,
    events,
    availableActions: [
      {
        label: "Run Analysis",
        command: "SubmitAnalysis",
        params: { propertyId },
      },
      {
        label: "Upload More",
        command: "UploadPhotos",
        params: { propertyId },
      },
    ],
  };
}
