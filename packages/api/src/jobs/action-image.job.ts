import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
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
    const buffer = await storageService.downloadPhoto(photo.storage_path);

    // 4. Build action-item-specific prompt and call editImage with rawPrompt
    const prompt = buildActionItemImagePrompt(actionItemTitle, room, styleDirection);
    const base64 = await renovationService.editImage({
      buffer,
      filename: photo.filename,
      prompt,
      quality,
      size,
      rawPrompt: true,
    });

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

    // 6. Update journey item with completed image
    await supabase
      .from("design_journey_items")
      .update({
        image_storage_path: storagePath,
        image_status: "completed",
      })
      .eq("id", journeyItemId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[action-image] Job failed for journey item ${journeyItemId}:`, message);
    await supabase
      .from("design_journey_items")
      .update({ image_status: "failed" })
      .eq("id", journeyItemId);
    throw err;
  }
}
