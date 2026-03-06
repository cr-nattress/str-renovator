import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
import * as renovationService from "../services/renovation.service.js";
import * as storageService from "../services/storage.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";

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

  try {
    // 1. Update renovation status to processing
    await supabase
      .from("renovations")
      .update({ status: "processing" })
      .eq("id", renovationId);

    // 2. Get analysis_photo + photo data
    const { data: analysisPhoto } = await supabase
      .from("analysis_photos")
      .select("*, photos(*)")
      .eq("id", analysisPhotoId)
      .single();

    if (!analysisPhoto) throw new Error("Analysis photo not found");

    const photo = (analysisPhoto as any).photos;
    if (!photo) throw new Error("Original photo not found");

    // 3. Get renovation row for feedback_context
    const { data: renovation } = await supabase
      .from("renovations")
      .select("*")
      .eq("id", renovationId)
      .single();

    // 4. Download original photo buffer
    const buffer = await storageService.downloadPhoto(photo.storage_path);

    // 5. Build prompt (including feedback_context if re-run)
    let prompt = analysisPhoto.renovations;
    if (renovation?.feedback_context) {
      prompt = `${prompt}\n\nIMPORTANT — Previous feedback from user:\n${renovation.feedback_context}`;
    }

    // 6. Call renovation service
    const base64 = await renovationService.editImage({
      buffer,
      filename: photo.filename,
      prompt,
      quality,
      size,
    });

    // 7. Upload result to Supabase Storage
    const resultBuffer = Buffer.from(base64, "base64");
    const resultFilename = `renovated-${Date.now()}-${photo.filename}`;
    const storagePath = await storageService.uploadPhoto(
      resultBuffer,
      userId,
      photo.property_id,
      resultFilename,
      "image/png"
    );

    // 8. Update renovation row
    await supabase
      .from("renovations")
      .update({ storage_path: storagePath, status: "completed" })
      .eq("id", renovationId);

    // 9. Update parent analysis completed_photos count
    const { data: ap } = await supabase
      .from("analysis_photos")
      .select("analysis_id")
      .eq("id", analysisPhotoId)
      .single();

    if (ap) {
      // Increment completed_photos
      const { data: analysis } = await supabase
        .from("analyses")
        .select("completed_photos, total_photos")
        .eq("id", ap.analysis_id)
        .single();

      if (analysis) {
        const newCount = (analysis.completed_photos ?? 0) + 1;
        const updateData: Record<string, any> = {
          completed_photos: newCount,
        };
        if (newCount >= analysis.total_photos) {
          updateData.status = "completed";
        }
        await supabase
          .from("analyses")
          .update(updateData)
          .eq("id", ap.analysis_id);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("renovations")
      .update({ status: "failed", error: message })
      .eq("id", renovationId);
    throw err;
  }
}
