/**
 * @module create-journey-items
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates design journey items from the action plan. Deduplicates against
 * existing items and enqueues action image generation jobs.
 */

import { enqueueActionImage } from "../../services/queue.service.js";
import type { PropertyAnalysis, ImageQuality, ImageSize } from "@str-renovator/shared";
import type { Logger } from "pino";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";
import * as photoRepo from "../../repositories/photo.repository.js";
import * as journeyRepo from "../../repositories/design-journey.repository.js";

interface CreateJourneyItemsInput {
  analysisId: string;
  propertyId: string;
  userId: string;
  analysis: PropertyAnalysis;
  quality: ImageQuality;
  size: ImageSize;
  log: Logger;
}

export async function createJourneyItems(input: CreateJourneyItemsInput): Promise<void> {
  const { analysisId, propertyId, userId, analysis, quality, size, log } = input;

  // Build room → photo_id map from analysis_photos
  const analysisPhotosForMap = await analysisPhotoRepo.listByAnalysis(analysisId);

  const roomToPhotoId = new Map<string, string>();
  for (const ap of analysisPhotosForMap) {
    roomToPhotoId.set(ap.room.toLowerCase(), ap.photo_id);
  }

  // Fetch all photos to get fallback first photo
  const firstPhoto = await photoRepo.findFirstByProperty(propertyId);

  const firstPhotoId = firstPhoto?.id ?? null;
  const styleDirection = analysis.style_direction ?? "";

  // Dedup: query existing journey items for this property
  const existingItems = await journeyRepo.listByProperty(propertyId);

  const existingByTitle = new Map(
    existingItems.map((i) => [i.title.toLowerCase(), i])
  );

  for (const action of analysis.action_plan) {
    let sourcePhotoId: string | null = null;
    for (const room of action.rooms_affected) {
      const matched = roomToPhotoId.get(room.toLowerCase());
      if (matched) {
        sourcePhotoId = matched;
        break;
      }
    }
    if (!sourcePhotoId) sourcePhotoId = firstPhotoId;

    const existing = existingByTitle.get(action.item.toLowerCase());

    if (existing) {
      if (existing.image_status === "completed" && existing.image_storage_path) continue;
      if (existing.image_status === "pending" || existing.image_status === "processing") continue;

      if (existing.image_status === "failed" || existing.image_status === "skipped") {
        const updates: Record<string, unknown> = { analysis_id: analysisId };
        if (sourcePhotoId) {
          updates.source_photo_id = sourcePhotoId;
          updates.image_status = "pending";
        }
        await journeyRepo.updateById(existing.id, updates);

        if (sourcePhotoId) {
          await enqueueActionImage(
            existing.id, sourcePhotoId, userId, propertyId,
            action.item, action.rooms_affected[0] ?? "Room",
            styleDirection, quality, size
          );
        }
        continue;
      }
    }

    const imageStatus = sourcePhotoId ? "pending" : "skipped";
    let journeyItem: { id: string };
    try {
      journeyItem = await journeyRepo.upsertByTitle({
        property_id: propertyId,
        analysis_id: analysisId,
        user_id: userId,
        priority: action.priority,
        title: action.item,
        estimated_cost: action.estimated_cost,
        impact: action.impact,
        rooms_affected: action.rooms_affected,
        source_photo_id: sourcePhotoId,
        image_status: imageStatus,
      });
    } catch (err) {
      log.error({ item: action.item, err: err instanceof Error ? err.message : "unknown error" }, "failed to create journey item");
      continue;
    }

    if (sourcePhotoId) {
      await enqueueActionImage(
        journeyItem.id, sourcePhotoId, userId, propertyId,
        action.item, action.rooms_affected[0] ?? "Room",
        styleDirection, quality, size
      );
    }
  }
}
