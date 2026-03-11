/**
 * @module enqueue-renovations
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets status to generating_images and enqueues renovation jobs
 * for each analysis photo.
 */

import pLimit from "p-limit";
import { enqueueRenovation } from "../../services/queue.service.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import * as renovationRepo from "../../repositories/renovation.repository.js";
import { logger } from "../../config/logger.js";
import { serializeError } from "../../config/errors.js";

const ENQUEUE_CONCURRENCY = 5;

export async function enqueueRenovations(
  analysisId: string,
  userId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  // Update total_photos to the actual number of analysis photos that will
  // have renovations generated. This may be fewer than the original photo
  // count if filename matching skipped some photos. The completion check
  // in renovate.job.ts uses total_photos to determine when all renovations
  // are done, so this value must match the actual enqueued count.
  await analysisRepo.updateStatus(analysisId, "generating_images", {
    total_photos: analysisPhotoIds.length,
    completed_photos: 0,
  });

  logger.info(
    { analysisId, renovationCount: analysisPhotoIds.length },
    "enqueuing renovations — total_photos set to actual analysis photo count"
  );

  let enqueuedCount = 0;
  const limit = pLimit(ENQUEUE_CONCURRENCY);

  await Promise.all(
    analysisPhotoIds.map((ap) =>
      limit(async () => {
        try {
          const renovation = await renovationRepo.create({
            analysis_photo_id: ap.id,
            user_id: userId,
            iteration: 1,
            status: "pending",
          });

          await enqueueRenovation(renovation.id, ap.id, userId, quality, size);
          enqueuedCount++;
          logger.info(
            { analysisId, analysisPhotoId: ap.id, renovationId: renovation.id, enqueuedCount },
            "renovation enqueued"
          );
        } catch (err) {
          logger.error(
            { analysisId, analysisPhotoId: ap.id, err: serializeError(err) },
            "failed to enqueue renovation for analysis photo"
          );
        }
      })
    )
  );

  logger.info({ analysisId, enqueuedCount, expected: analysisPhotoIds.length }, "all renovations enqueued");
}
