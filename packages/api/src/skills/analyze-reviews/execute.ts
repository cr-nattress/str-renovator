/**
 * @module analyze-reviews/execute
 * @capability Guest review analysis skill
 * @layer Execution
 *
 * Analyzes guest reviews from STR listings via GPT-4o with JSON mode.
 * Extracts sentiment, recurring themes, strengths, concerns, and
 * actionable improvement opportunities.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 * @see packages/shared/src/schemas/ai-responses.ts — ReviewAnalysisSchema
 */

import {
  REVIEW_ANALYSIS_SYSTEM_PROMPT,
  REVIEW_ANALYSIS_PROMPT_VERSION,
  buildReviewAnalysisPrompt,
  ReviewAnalysisSchema,
  type AiResult,
} from "@str-renovator/shared";
import { executeJsonChatCompletion } from "../../services/llm.service.js";

export async function analyzeReviews(
  reviewContent: string,
  propertyName?: string
): Promise<AiResult<Record<string, unknown>>> {
  return executeJsonChatCompletion({
    systemPrompt: REVIEW_ANALYSIS_SYSTEM_PROMPT,
    userMessage: buildReviewAnalysisPrompt(reviewContent, propertyName),
    schema: ReviewAnalysisSchema,
    promptVersion: REVIEW_ANALYSIS_PROMPT_VERSION,
    errorLabel: "review analysis",
  });
}
