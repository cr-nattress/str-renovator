/**
 * @module aggregate-results
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Aggregates batch results and saves the merged analysis to the database.
 */

import { supabase } from "../../config/supabase.js";
import * as batchService from "../../services/batch.service.js";
import type { PropertyAnalysis, AiMetadata } from "@str-renovator/shared";

export interface AggregationResult {
  analysis: PropertyAnalysis;
  metadata: AiMetadata;
}

export async function aggregateAndSaveResults(
  analysisId: string
): Promise<AggregationResult> {
  await supabase
    .from("analyses")
    .update({ status: "aggregating" })
    .eq("id", analysisId);

  const { data: analysis, metadata } = await batchService.aggregateBatchResults(analysisId);

  await supabase
    .from("analyses")
    .update({
      property_assessment: analysis.property_assessment,
      style_direction: analysis.style_direction,
      raw_json: analysis,
      prompt_version: metadata.promptVersion,
      model: metadata.model,
      tokens_used: metadata.tokensUsed,
    })
    .eq("id", analysisId);

  return { analysis, metadata };
}
