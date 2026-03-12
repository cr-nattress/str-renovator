/**
 * @module generate-full-renovations
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Enqueues full-renovation composite image jobs for each analysis photo.
 * Runs after enqueue-renovations so that individual action images and
 * full-renovation images generate in parallel.
 */

import { enqueueFullRenovation } from "../../services/queue.service.js";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import type { Logger } from "pino";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";

export async function generateFullRenovations(
  analysisId: string,
  userId: string,
  propertyId: string,
  analysisPhotoRecords: AnalysisPhotoRecord[],
  quality: ImageQuality,
  size: ImageSize,
  log: Logger,
): Promise<void> {
  if (analysisPhotoRecords.length === 0) return;

  for (const record of analysisPhotoRecords) {
    await analysisPhotoRepo.updateFullRenovation(record.id, null, "processing");
    await enqueueFullRenovation(record.id, userId, propertyId, quality, size);
  }

  log.info(
    { count: analysisPhotoRecords.length },
    "full-renovation jobs enqueued",
  );
}
