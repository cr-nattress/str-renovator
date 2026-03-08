/**
 * @module enqueue-renovations
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets status to generating_images and enqueues renovation jobs
 * for each analysis photo.
 */

import { supabase } from "../../config/supabase.js";
import { enqueueRenovation } from "../../services/queue.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";

export async function enqueueRenovations(
  analysisId: string,
  userId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await supabase
    .from("analyses")
    .update({
      status: "generating_images",
      total_photos: analysisPhotoIds.length,
    })
    .eq("id", analysisId);

  for (const ap of analysisPhotoIds) {
    const { data: renovation, error: renError } = await supabase
      .from("renovations")
      .insert({
        analysis_photo_id: ap.id,
        user_id: userId,
        iteration: 1,
        status: "pending",
      })
      .select("id")
      .single();

    if (renError || !renovation) continue;
    await enqueueRenovation(renovation.id, ap.id, userId, quality, size);
  }
}
