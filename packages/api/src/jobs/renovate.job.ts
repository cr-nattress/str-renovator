import type { Job } from "bullmq";
import * as renovationService from "../services/renovation.service.js";
import * as storageService from "../services/storage.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as analysisPhotoRepo from "../repositories/analysis-photo.repository.js";
import * as analysisRepo from "../repositories/analysis.repository.js";

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
    await renovationRepo.updateStatus(renovationId, "processing");

    // 2. Get analysis_photo + photo data
    const analysisPhoto = await analysisPhotoRepo.findByIdWithPhoto(analysisPhotoId);

    if (!analysisPhoto) throw new Error("Analysis photo not found");

    const photo = (analysisPhoto as any).photos;
    if (!photo) throw new Error("Original photo not found");

    // 3. Get renovation row for feedback_context
    const renovation = await renovationRepo.findByIdAndUser(renovationId, userId);

    // 4. Download original photo buffer
    const buffer = await storageService.downloadPhoto(photo.storage_path);

    // 5. Build prompt (including feedback_context if re-run)
    let prompt = analysisPhoto.renovations;
    if (renovation?.feedback_context) {
      prompt = `${prompt}\n\nIMPORTANT — Previous feedback from user:\n${renovation.feedback_context}`;
    }

    // 6. Call renovation service
    const { data: base64, metadata } = await renovationService.editImage({
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

    // 8. Update renovation row with AI metadata
    await renovationRepo.updateStatus(renovationId, "completed", {
      storage_path: storagePath,
      prompt_version: metadata.promptVersion,
      model: metadata.model,
      tokens_used: metadata.tokensUsed,
    });

    // 9. Update parent analysis completed_photos count
    if (analysisPhoto) {
      // Atomic increment to prevent race conditions with concurrent job completions
      const updated = await analysisRepo.incrementCounter("completed_photos", analysisPhoto.analysis_id);

      const analysis = (updated as any)?.[0];
      if (analysis && analysis.completed_photos >= analysis.total_photos) {
        const finalStatus =
          (analysis.failed_batches ?? 0) > 0
            ? "partially_completed"
            : "completed";
        await analysisRepo.updateStatus(analysisPhoto.analysis_id, finalStatus);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await renovationRepo.updateStatus(renovationId, "failed", { error: message });
    throw err;
  }
}
