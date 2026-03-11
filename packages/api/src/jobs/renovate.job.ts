import type { Job } from "bullmq";
import { createChildLogger } from "../config/logger.js";
import * as renovationService from "../skills/edit-image/index.js";
import * as storageService from "../services/storage.service.js";
import type { ImageQuality, ImageSize, RenovationCompletedEvent } from "@str-renovator/shared";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as analysisPhotoRepo from "../repositories/analysis-photo.repository.js";
import { publishEvents } from "../events/event-bus.js";

interface RenovationJobData {
  renovationId: string;
  analysisPhotoId: string;
  userId: string;
  quality: ImageQuality;
  size: ImageSize;
}

export async function processRenovationJob(
  job: Job<RenovationJobData>
): Promise<void> {
  const { renovationId, analysisPhotoId, userId, quality, size } = job.data;
  const log = createChildLogger({ jobType: "renovation", renovationId, analysisPhotoId });

  log.info({ jobId: job.id, quality, size }, "renovation job started");

  try {
    // 1. Update renovation status to processing
    await renovationRepo.updateStatus(renovationId, "processing");

    // 2. Get analysis_photo + photo data
    const analysisPhoto = await analysisPhotoRepo.findByIdWithPhoto(analysisPhotoId);

    if (!analysisPhoto) {
      log.error("analysis photo not found");
      throw new Error("Analysis photo not found");
    }

    const photo = (analysisPhoto as any).photos;
    if (!photo) {
      log.error({ analysisPhotoId }, "original photo not found on analysis photo record");
      throw new Error("Original photo not found");
    }

    log.info({ photoId: photo.id, filename: photo.filename, storagePath: photo.storage_path }, "source photo loaded");

    // 3. Get renovation row for feedback_context
    const renovation = await renovationRepo.findByIdAndUser(renovationId, userId);

    // 4. Download original photo buffer
    log.info("downloading original photo from storage");
    const buffer = await storageService.downloadPhoto(photo.storage_path);
    log.info({ bufferSize: buffer.length }, "photo downloaded");

    // 5. Build prompt (including feedback_context if re-run)
    let prompt = analysisPhoto.renovations;
    if (renovation?.feedback_context) {
      prompt = `${prompt}\n\nIMPORTANT — Previous feedback from user:\n${renovation.feedback_context}`;
      log.info({ feedbackLength: renovation.feedback_context.length }, "appending user feedback to prompt");
    }

    // 6. Call renovation service
    log.info({ quality, size }, "calling OpenAI image edit");
    const { data: base64, metadata } = await renovationService.editImage({
      buffer,
      filename: photo.filename,
      prompt,
      quality,
      size,
    });
    log.info({ model: metadata.model, tokensUsed: metadata.tokensUsed, resultSize: base64.length }, "image edit complete");

    // 7. Upload result to Supabase Storage
    const resultBuffer = Buffer.from(base64, "base64");
    const resultFilename = `renovated-${Date.now()}-${photo.filename}`;
    log.info({ resultFilename }, "uploading renovation image to storage");
    const storagePath = await storageService.uploadPhoto(
      resultBuffer,
      userId,
      photo.property_id,
      resultFilename,
      "image/png"
    );
    log.info({ storagePath }, "renovation image uploaded");

    // 8. Update renovation row with AI metadata
    await renovationRepo.updateStatus(renovationId, "completed", {
      storage_path: storagePath,
      prompt_version: metadata.promptVersion,
      model: metadata.model,
      tokens_used: metadata.tokensUsed,
    });

    // 9. Get iteration from renovation for event payload
    const completedRenovation = await renovationRepo.findByIdAndUser(renovationId, userId);
    const iteration = completedRenovation?.iteration ?? 1;

    // 10. Publish RenovationCompleted — analysis-finalizer handler manages counter/status
    const events: RenovationCompletedEvent[] = [
      {
        type: "RenovationCompleted",
        entityId: renovationId,
        entityType: "Renovation",
        userId,
        timestamp: new Date().toISOString(),
        data: {
          renovationId,
          analysisPhotoId,
          userId,
          iteration,
          promptVersion: metadata.promptVersion,
        },
      },
    ];
    await publishEvents(events);

    log.info("renovation job completed successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.error({ err: message, stack }, "renovation job failed");
    await renovationRepo.updateStatus(renovationId, "failed", { error: message });
    throw err;
  }
}
