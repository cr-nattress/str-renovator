/**
 * @module analyze.job
 * @capability Analysis pipeline orchestrator
 * @layer Orchestration
 *
 * Orchestrates the multi-step analysis pipeline by delegating to
 * focused step functions. Each step is independently testable.
 *
 * Pipeline: fetch context → process batches → aggregate → create photos
 *   → create journey items → enqueue renovations → generate reports → finalize
 */

import type { Job } from "bullmq";
import { createChildLogger } from "../config/logger.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import * as analysisRepo from "../repositories/analysis.repository.js";

import { fetchAnalysisContext } from "./steps/fetch-context.js";
import { processBatches } from "./steps/process-batches.js";
import { aggregateAndSaveResults } from "./steps/aggregate-results.js";
import { createAnalysisPhotos } from "./steps/create-analysis-photos.js";
import { createJourneyItems } from "./steps/create-journey-items.js";
import { enqueueRenovations } from "./steps/enqueue-renovations.js";
import { generateReports } from "./steps/generate-reports.js";
import { finalizeAnalysis } from "./steps/finalize-analysis.js";

interface AnalysisJobData {
  analysisId: string;
  propertyId: string;
  userId: string;
  quality: ImageQuality;
  size: ImageSize;
}

export async function processAnalysisJob(
  job: Job<AnalysisJobData>
): Promise<void> {
  const { analysisId, propertyId, userId, quality, size } = job.data;
  const log = createChildLogger({ jobType: "analysis", analysisId, propertyId });

  log.info({ jobId: job.id, quality, size }, "analysis job started");

  try {
    log.info("step 1/7: fetching analysis context");
    const { typedPhotos, context } = await fetchAnalysisContext(analysisId, propertyId);
    log.info({ photoCount: typedPhotos.length, hasContext: !!context }, "context fetched");

    log.info("step 2/7: processing batches");
    const { completedCount, failedCount } = await processBatches(analysisId, typedPhotos, context, log);
    log.info({ completedCount, failedCount }, "batch processing complete");

    log.info("step 3/7: aggregating results");
    const { analysis } = await aggregateAndSaveResults(analysisId);
    log.info(
      { photoResults: analysis.photos.length, actionPlanItems: analysis.action_plan.length },
      "aggregation complete"
    );

    log.info("step 4/7: creating analysis photos");
    const analysisPhotoIds = await createAnalysisPhotos(analysisId, analysis, typedPhotos);
    log.info(
      { created: analysisPhotoIds.length, aiResults: analysis.photos.length, availablePhotos: typedPhotos.length },
      "analysis photos created"
    );

    log.info("step 5/7: creating journey items");
    await createJourneyItems({
      analysisId, propertyId, userId, analysis, quality, size, log,
    });
    log.info("journey items created");

    log.info("step 6/7: enqueueing renovations");
    await enqueueRenovations(analysisId, userId, analysisPhotoIds, quality, size);
    log.info({ renovationCount: analysisPhotoIds.length }, "renovations enqueued");

    log.info("step 7/7: generating reports");
    await generateReports(analysisPhotoIds, log);
    log.info("reports generated");

    await finalizeAnalysis(analysisId, analysisPhotoIds, failedCount, log);
    log.info("analysis job completed successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.error({ err: message, stack }, "analysis job failed");
    await analysisRepo.updateStatus(analysisId, "failed", { error: message });
    throw err;
  }
}
