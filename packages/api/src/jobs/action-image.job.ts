import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
import { createChildLogger } from "../config/logger.js";
import * as renovationService from "../services/renovation.service.js";
import * as storageService from "../services/storage.service.js";
import { buildActionItemImagePrompt, type ImageQuality, type ImageSize } from "@str-renovator/shared";

interface ActionImageJobData {
  journeyItemId: string;
  sourcePhotoId: string;
  userId: string;
  propertyId: string;
  actionItemTitle: string;
  room: string;
  styleDirection: string;
  quality: ImageQuality;
  size: ImageSize;
}

export async function processActionImageJob(
  job: Job<ActionImageJobData>
): Promise<void> {
  const {
    journeyItemId,
    sourcePhotoId,
    userId,
    propertyId,
    actionItemTitle,
    room,
    styleDirection,
    quality,
    size,
  } = job.data;

  const log = createChildLogger({ jobType: "action-image", journeyItemId });
  const startTime = Date.now();

  // Guard: no source photo — mark skipped and exit (not retryable)
  if (!sourcePhotoId) {
    log.warn("no source photo, marking skipped");
    await supabase
      .from("design_journey_items")
      .update({ image_status: "skipped" })
      .eq("id", journeyItemId);
    return;
  }

  try {
    // 1. Set image_status to processing
    await supabase
      .from("design_journey_items")
      .update({ image_status: "processing" })
      .eq("id", journeyItemId);

    // 2. Get the source photo
    const { data: photo } = await supabase
      .from("photos")
      .select("*")
      .eq("id", sourcePhotoId)
      .single();

    if (!photo) throw new Error("Source photo not found");

    // 3. Download original photo buffer
    const downloadStart = Date.now();
    const buffer = await storageService.downloadPhoto(photo.storage_path);
    log.info({ durationMs: Date.now() - downloadStart }, "photo download completed");

    // 4. Build action-item-specific prompt and call editImage with rawPrompt
    const photoConstraints = (photo as any).constraints as string[] | undefined;
    const prompt = buildActionItemImagePrompt(
      actionItemTitle,
      room,
      styleDirection,
      photoConstraints?.length ? photoConstraints : undefined
    );
    const dalleStart = Date.now();
    const { data: base64, metadata } = await renovationService.editImage({
      buffer,
      filename: photo.filename,
      prompt,
      quality,
      size,
      rawPrompt: true,
    });
    log.info({ durationMs: Date.now() - dalleStart }, "DALL-E edit completed");

    // 5. Upload result to Supabase Storage
    const resultBuffer = Buffer.from(base64, "base64");
    const resultFilename = `action-${Date.now()}-${photo.filename}`;
    const storagePath = await storageService.uploadPhoto(
      resultBuffer,
      userId,
      propertyId,
      resultFilename,
      "image/png"
    );

    // 6. Update journey item with completed image and AI metadata
    await supabase
      .from("design_journey_items")
      .update({
        image_storage_path: storagePath,
        image_status: "completed",
        prompt_version: metadata.promptVersion,
        model: metadata.model,
        tokens_used: metadata.tokensUsed,
      })
      .eq("id", journeyItemId);

    log.info({ durationMs: Date.now() - startTime }, "job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isFinalAttempt = job.attemptsMade >= ((job.opts.attempts ?? 1) - 1);
    log.error({ err: message, attempt: job.attemptsMade + 1, maxAttempts: job.opts.attempts ?? 1 }, "job failed");

    if (isFinalAttempt) {
      await supabase
        .from("design_journey_items")
        .update({ image_status: "failed" })
        .eq("id", journeyItemId);
    }
    // Leave as "processing" on non-final attempts so UI doesn't flash "failed"

    throw err;
  }
}
