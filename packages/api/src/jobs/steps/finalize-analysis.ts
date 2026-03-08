/**
 * @module finalize-analysis
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Sets the final analysis status based on batch failures and photo count.
 */

import { supabase } from "../../config/supabase.js";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";

export async function finalizeAnalysis(
  analysisId: string,
  analysisPhotoIds: AnalysisPhotoRecord[],
  failedCount: number
): Promise<void> {
  if (analysisPhotoIds.length === 0) {
    const finalStatus = failedCount > 0 ? "partially_completed" : "completed";
    await supabase
      .from("analyses")
      .update({ status: finalStatus })
      .eq("id", analysisId);
  } else if (failedCount > 0) {
    // Renovation jobs are running; store failure marker so the renovation
    // completion handler can set partially_completed instead of completed
    await supabase
      .from("analyses")
      .update({ failed_batches: failedCount })
      .eq("id", analysisId);
  }
  // When analysisPhotoIds.length > 0 and failedCount === 0, status stays
  // at generating_images — renovate.job.ts sets completed once all finish
}
