/**
 * @module generate-text-report/execute
 * @capability Text report generation skill
 * @layer Execution
 *
 * Produces a structured prose report for renovation recommendations
 * via GPT-4o. Each item includes a 'Why it matters' rationale for
 * STR context.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 */

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { openAiConnector } from "../../connectors/openai.connector.js";
import {
  REPORT_SYSTEM_PROMPT,
  REPORT_PROMPT_VERSION,
  buildReportUserPrompt,
  type AiMetadata,
  type AiResult,
} from "@str-renovator/shared";

export async function generateTextReport(
  renovations: string
): Promise<AiResult<string>> {
  logger.info({ promptLength: renovations.length }, "calling OpenAI for report generation");

  const response = await openAiConnector.chatCompletion({
    systemPrompt: REPORT_SYSTEM_PROMPT,
    userMessage: buildReportUserPrompt(renovations),
    model: env.openaiChatModel,
    maxTokens: 2048,
  });

  const content = response.content;
  if (!content) {
    logger.error({ model: response.model }, "empty response from report model");
    throw new Error("Empty response from report model");
  }

  logger.info({ model: response.model, tokensUsed: response.usage.totalTokens, reportLength: content.length }, "report generated");

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    promptVersion: REPORT_PROMPT_VERSION,
  };

  return { data: content, metadata };
}
