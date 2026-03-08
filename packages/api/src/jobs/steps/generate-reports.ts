/**
 * @module generate-reports
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Generates text reports for each analysis photo.
 */

import { supabase } from "../../config/supabase.js";
import * as reportService from "../../services/report.service.js";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";

export async function generateReports(
  analysisPhotoIds: AnalysisPhotoRecord[]
): Promise<void> {
  for (const ap of analysisPhotoIds) {
    const { data: report } = await reportService.generateTextReport(ap.renovations);
    await supabase
      .from("analysis_photos")
      .update({ report })
      .eq("id", ap.id);
  }
}
