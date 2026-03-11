/**
 * @module aggregate-batch-analyses/execute
 * @capability Batch analysis aggregation skill
 * @layer Execution
 *
 * Combines multiple batch PropertyAnalysis results into a single cohesive
 * analysis. When only one batch exists, returns it directly. For multiple
 * batches, calls GPT-4o to merge assessments, photo arrays, and action plans.
 *
 * @see packages/shared/src/prompts/index.ts — AGGREGATION_SYSTEM_PROMPT
 * @see packages/shared/src/schemas/ai-responses.ts — PropertyAnalysisSchema
 */

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { serializeError } from "../../config/errors.js";
import { openAiConnector } from "../../connectors/openai.connector.js";
import {
  AGGREGATION_SYSTEM_PROMPT,
  AGGREGATION_PROMPT_VERSION,
  PropertyAnalysisSchema,
  type AiMetadata,
  type AiResult,
  type PropertyAnalysis,
} from "@str-renovator/shared";

/**
 * Aggregates an array of batch PropertyAnalysis results into a single merged result.
 *
 * If only one result is provided, returns it directly without an extra AI call.
 * For multiple results, calls GPT-4o to produce a unified assessment.
 */
export async function aggregateBatchAnalyses(
  results: PropertyAnalysis[],
  analysisId: string
): Promise<AiResult<PropertyAnalysis>> {
  logger.info({ analysisId, batchCount: results.length }, "aggregating batch results");

  // If only one batch succeeded, use its result directly
  if (results.length === 1) {
    logger.info({ analysisId }, "single batch — using result directly, no aggregation needed");
    const metadata: AiMetadata = {
      model: env.openaiChatModel,
      tokensUsed: 0,
      promptVersion: AGGREGATION_PROMPT_VERSION,
    };
    return { data: results[0], metadata };
  }

  // Multiple batches — call GPT-4o to merge
  logger.info({ analysisId, batchCount: results.length }, "multiple batches — calling OpenAI to aggregate");
  const batchSummaries = results.map((r, i) => ({
    batch: i + 1,
    property_assessment: r.property_assessment,
    style_direction: r.style_direction,
    photos: r.photos,
    action_plan: r.action_plan,
  }));

  const response = await openAiConnector.chatCompletion({
    systemPrompt: AGGREGATION_SYSTEM_PROMPT,
    userMessage: `Here are the batch analysis results to merge:\n\n${JSON.stringify(batchSummaries, null, 2)}`,
    model: env.openaiChatModel,
    maxTokens: 4096,
  });

  const content = response.content;
  if (!content) {
    logger.error({ analysisId }, "empty response from aggregation model");
    throw new Error("Empty response from aggregation model");
  }

  logger.info({ analysisId, responseLength: content.length }, "aggregation response received — parsing");

  const cleaned = content.replace(/```json\s*|```/g, "").trim();
  let jsonParsed: unknown;
  try {
    jsonParsed = JSON.parse(cleaned);
  } catch (parseErr) {
    logger.error({ analysisId, rawContent: cleaned.substring(0, 500), err: serializeError(parseErr) }, "aggregation response JSON parse failed");
    throw new Error(`Aggregation response is not valid JSON: ${serializeError(parseErr)}`);
  }

  const parsed = PropertyAnalysisSchema.safeParse(jsonParsed);
  if (!parsed.success) {
    logger.error({ analysisId, zodErrors: parsed.error.issues }, "aggregation response Zod validation failed");
    throw new Error(`Aggregation response validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    promptVersion: AGGREGATION_PROMPT_VERSION,
  };

  logger.info(
    { analysisId, model: metadata.model, tokensUsed: metadata.tokensUsed, photoCount: parsed.data.photos.length },
    "aggregation complete"
  );

  return { data: parsed.data, metadata };
}
