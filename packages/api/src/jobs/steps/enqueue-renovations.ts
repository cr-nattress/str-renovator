/**
 * @module enqueue-renovations
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets status to generating_images and enqueues renovation jobs
 * for each analysis photo.
 */

import { enqueueRenovation } from "../../services/queue.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import * as renovationRepo from "../../repositories/renovation.repository.js";

export async function enqueueRenovations(
  analysisId: string,
  userId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await analysisRepo.updateStatus(analysisId, "generating_images", {
    total_photos: analysisPhotoIds.length,
  });

  for (const ap of analysisPhotoIds) {
    try {
      const renovation = await renovationRepo.create({
        analysis_photo_id: ap.id,
        user_id: userId,
        iteration: 1,
        status: "pending",
      });

      await enqueueRenovation(renovation.id, ap.id, userId, quality, size);
    } catch {
      continue;
    }
  }
}
