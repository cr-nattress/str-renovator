/**
 * @module full-renovation.job
 * @capability Full-renovation composite image generation
 * @layer Orchestration
 *
 * Generates a single DALL-E image for an analysis_photo showing ALL
 * action items for that room applied simultaneously. Downloads the
 * original photo, gathers action descriptions from journey items,
 * calls the generate-full-renovation skill, and uploads the result.
 */

import type { Job } from "bullmq";
import { createChildLogger } from "../config/logger.js";
import { generateFullRenovation } from "../skills/generate-full-renovation/index.js";
import * as storageService from "../services/storage.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import * as analysisPhotoRepo from "../repositories/analysis-photo.repository.js";
import * as journeyRepo from "../repositories/design-journey.repository.js";

interface FullRenovationJobData {
  analysisPhotoId: string;
  userId: string;
  propertyId: string;
  quality: ImageQuality;
  size: ImageSize;
}

export async function processFullRenovationJob(
  job: Job<FullRenovationJobData>,
): Promise<void> {
  const { analysisPhotoId, userId, propertyId, quality, size } = job.data;
  const log = createChildLogger({ jobType: "full-renovation", analysisPhotoId });
  const startTime = Date.now();

  try {
    // 1. Fetch analysis photo with its source photo
    const ap = await analysisPhotoRepo.findByIdWithPhoto(analysisPhotoId);
    if (!ap || !ap.photos) {
      log.warn("analysis photo or source photo not found, marking failed");
      await analysisPhotoRepo.updateFullRenovation(analysisPhotoId, null, "failed");
      return;
    }

    // 2. Gather all action item descriptions for rooms matching this photo's room
    const journeyItems = await journeyRepo.listByProperty(propertyId);
    const roomLower = ap.room.toLowerCase();
    const actionDescriptions = journeyItems
      .filter((item) =>
        item.rooms_affected.some((r) => r.toLowerCase() === roomLower),
      )
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.title);

    if (actionDescriptions.length === 0) {
      log.info("no action items for this room, marking completed with no image");
      await analysisPhotoRepo.updateFullRenovation(analysisPhotoId, null, "completed");
      return;
    }

    // 3. Download original photo
    const downloadStart = Date.now();
    const buffer = await storageService.downloadPhoto(ap.photos.storage_path);
    log.info({ durationMs: Date.now() - downloadStart }, "photo download completed");

    // 4. Call the skill
    const dalleStart = Date.now();
    const { data: base64, metadata } = await generateFullRenovation({
      buffer,
      filename: ap.photos.filename,
      actionDescriptions,
      room: ap.room,
      styleDirection: "",
      constraints: [],
      quality,
      size,
    });
    log.info({ durationMs: Date.now() - dalleStart, actionCount: actionDescriptions.length }, "DALL-E full renovation completed");

    // 5. Upload to storage
    const resultBuffer = Buffer.from(base64, "base64");
    const resultFilename = `full-renovation-${Date.now()}-${ap.photos.filename}`;
    const storagePath = await storageService.uploadPhoto(
      resultBuffer,
      userId,
      propertyId,
      resultFilename,
      "image/png",
    );

    // 6. Update analysis_photo with result
    await analysisPhotoRepo.updateFullRenovation(analysisPhotoId, storagePath, "completed");

    log.info({ durationMs: Date.now() - startTime }, "full renovation job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isFinalAttempt = job.attemptsMade >= ((job.opts.attempts ?? 1) - 1);
    log.error({ err: message, attempt: job.attemptsMade + 1 }, "full renovation job failed");

    if (isFinalAttempt) {
      await analysisPhotoRepo.updateFullRenovation(analysisPhotoId, null, "failed");
    }

    throw err;
  }
}
