/**
 * @module analysis-finalizer
 * @capability Checks analysis completion when renovations finish
 * @layer Execution
 *
 * Listens to RenovationCompleted and RenovationFailed events.
 * After each, checks whether all renovations for the parent analysis
 * are done and, if so, sets the analysis to its final status.
 *
 * This logic was previously inlined in renovate.job.ts and worker.ts.
 *
 * @see packages/api/src/jobs/renovate.job.ts — event publisher
 * @see packages/api/src/repositories/analysis.repository.ts — status updates
 */

import type { DomainEvent, RenovationCompletedEvent, RenovationFailedEvent } from "@str-renovator/shared";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import { logger } from "../../config/logger.js";

export async function handleAnalysisFinalization(event: DomainEvent): Promise<void> {
  const e = event as RenovationCompletedEvent | RenovationFailedEvent;
  const { analysisPhotoId } = e.data;

  const analysisPhoto = await analysisPhotoRepo.findByIdWithPhoto(analysisPhotoId);
  if (!analysisPhoto) {
    logger.warn({ analysisPhotoId }, "analysis photo not found during finalization");
    return;
  }

  const analysisId = analysisPhoto.analysis_id;
  const updated = await analysisRepo.incrementCounter("completed_photos", analysisId);
  const analysis = (updated as any)?.[0];

  if (!analysis) {
    logger.warn({ analysisId }, "increment_counter returned no data during finalization");
    return;
  }

  logger.info(
    { analysisId, completedPhotos: analysis.completed_photos, totalPhotos: analysis.total_photos },
    "analysis photo counter incremented via event handler",
  );

  if (analysis.completed_photos >= analysis.total_photos) {
    const finalStatus = (analysis.failed_batches ?? 0) > 0 || e.type === "RenovationFailed"
      ? "partially_completed"
      : "completed";
    await analysisRepo.updateStatus(analysisId, finalStatus);
    logger.info({ analysisId, finalStatus }, "analysis finalized via event handler");
  }
}
