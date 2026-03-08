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

export interface AggregationResult {
  analysis: PropertyAnalysis;
  metadata: AiMetadata;
}

export async function aggregateAndSaveResults(
  analysisId: string
): Promise<AggregationResult> {
  await analysisRepo.updateStatus(analysisId, "aggregating");

  const { data: analysis, metadata } = await batchService.aggregateBatchResults(analysisId);

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
