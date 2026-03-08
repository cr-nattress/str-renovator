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
import { supabase } from "../config/supabase.js";
import { createChildLogger } from "../config/logger.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";

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

  try {
    const { typedPhotos, context } = await fetchAnalysisContext(analysisId, propertyId);

    const { failedCount } = await processBatches(analysisId, typedPhotos, context, log);

    const { analysis } = await aggregateAndSaveResults(analysisId);

    const analysisPhotoIds = await createAnalysisPhotos(analysisId, analysis, typedPhotos);

    await createJourneyItems({
      analysisId, propertyId, userId, analysis, quality, size, log,
    });

    await enqueueRenovations(analysisId, userId, analysisPhotoIds, quality, size);

    await generateReports(analysisPhotoIds);

    await finalizeAnalysis(analysisId, analysisPhotoIds, failedCount);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("analyses")
      .update({ status: "failed", error: message })
      .eq("id", analysisId);
    throw err;
  }
}
