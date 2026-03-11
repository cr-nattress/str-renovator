/**
 * @module generate-reports
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Generates text reports for each analysis photo with concurrency limiting.
 */

import pLimit from "p-limit";
import * as reportService from "../../skills/generate-text-report/index.js";
import type { AnalysisPhotoRecord } from "./create-analysis-photos.js";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";
import type { Logger } from "pino";
import { serializeError } from "../../config/errors.js";

const REPORT_CONCURRENCY = 3;

export async function generateReports(
  analysisPhotoIds: AnalysisPhotoRecord[],
  log: Logger
): Promise<void> {
  const limit = pLimit(REPORT_CONCURRENCY);

  await Promise.all(
    analysisPhotoIds.map((ap, i) =>
      limit(async () => {
        try {
          log.info({ index: i + 1, total: analysisPhotoIds.length, analysisPhotoId: ap.id }, "generating report");
          const { data: report } = await reportService.generateTextReport(ap.renovations);
          await analysisPhotoRepo.updateReport(ap.id, report);
        } catch (err) {
          log.error(
            { analysisPhotoId: ap.id, err: serializeError(err) },
            "failed to generate report for analysis photo"
          );
        }
      })
    )
  );
}
