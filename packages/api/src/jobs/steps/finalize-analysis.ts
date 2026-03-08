/**
 * @module finalize-analysis
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets the final analysis status based on batch failures and photo count.
 */

import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";

export async function finalizeAnalysis(
  analysisId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  failedCount: number
): Promise<void> {
  if (analysisPhotoIds.length === 0) {
    const finalStatus = failedCount > 0 ? "partially_completed" : "completed";
    await analysisRepo.updateStatus(analysisId, finalStatus);
  } else if (failedCount > 0) {
    // Renovation jobs are running; store failure marker so the renovation
    // completion handler can set partially_completed instead of completed
    await analysisRepo.updateStatus(analysisId, "generating_images", { failed_batches: failedCount });
  }
  // When analysisPhotoIds.length > 0 and failedCount === 0, status stays
  // at generating_images — renovate.job.ts sets completed once all finish
}
