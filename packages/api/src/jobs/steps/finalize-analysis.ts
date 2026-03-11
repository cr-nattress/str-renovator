/**
 * @module finalize-analysis
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets the final analysis status based on batch failures and photo count.
 */

import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import type { Logger } from "pino";

export async function finalizeAnalysis(
  analysisId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  failedCount: number,
  log: Logger
): Promise<void> {
  if (analysisPhotoIds.length === 0) {
    const finalStatus = failedCount > 0 ? "partially_completed" : "completed";
    log.info(
      { finalStatus, failedCount, reason: "no analysis photos to renovate" },
      "finalizing analysis"
    );
    await analysisRepo.updateStatus(analysisId, finalStatus);
  } else if (failedCount > 0) {
    // Renovation jobs are running; store failure marker so the renovation
    // completion handler can set partially_completed instead of completed
    log.info(
      { failedCount, analysisPhotoCount: analysisPhotoIds.length, reason: "has failures, waiting for renovations" },
      "finalizing analysis — storing failure marker"
    );
    await analysisRepo.updateStatus(analysisId, "generating_images", { failed_batches: failedCount });
  } else {
    log.info(
      { analysisPhotoCount: analysisPhotoIds.length, reason: "all batches succeeded, waiting for renovations" },
      "finalizing analysis — status stays generating_images"
    );
  }
  // When analysisPhotoIds.length > 0 and failedCount === 0, status stays
  // at generating_images — renovate.job.ts sets completed once all finish
}
