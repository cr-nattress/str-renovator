/**
 * @module aggregate-results
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Aggregates batch results and saves the merged analysis to the database.
 */

import * as batchService from "../../services/batch.service.js";
import type { PropertyAnalysis, AiMetadata } from "@str-renovator/shared";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import { logger } from "../../config/logger.js";

export interface AggregationResult {
  analysis: PropertyAnalysis;
  metadata: AiMetadata;
}

export async function aggregateAndSaveResults(
  analysisId: string
): Promise<AggregationResult> {
  await analysisRepo.updateStatus(analysisId, "aggregating");

  logger.info({ analysisId }, "starting batch result aggregation");

  const { data: analysis, metadata } = await batchService.aggregateBatchResults(analysisId);

  logger.info(
    {
      analysisId,
      model: metadata.model,
      tokensUsed: metadata.tokensUsed,
      promptVersion: metadata.promptVersion,
      photoCount: analysis.photos.length,
      actionPlanCount: analysis.action_plan.length,
      filenames: analysis.photos.map(p => p.filename),
    },
    "aggregation complete — saving results"
  );

  await analysisRepo.updateStatus(analysisId, "aggregating", {
    property_assessment: analysis.property_assessment,
    style_direction: analysis.style_direction,
    raw_json: analysis,
    prompt_version: metadata.promptVersion,
    model: metadata.model,
    tokens_used: metadata.tokensUsed,
  });

  return { analysis, metadata };
}
