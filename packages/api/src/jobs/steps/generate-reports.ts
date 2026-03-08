/**
 * @module generate-reports
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Generates text reports for each analysis photo.
 */

import * as reportService from "../../services/report.service.js";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";

export async function generateReports(
  analysisPhotoIds: AnalysisPhotoRecord[]
): Promise<void> {
  for (const ap of analysisPhotoIds) {
    const { data: report } = await reportService.generateTextReport(ap.renovations);
    await analysisPhotoRepo.updateReport(ap.id, report);
  }
}
