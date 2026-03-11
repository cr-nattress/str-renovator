/**
 * @module analyze-property/execute
 * @capability Vision-based property photo analysis skill
 * @layer Execution
 *
 * Sends listing photos to GPT-4o vision for room-by-room renovation
 * recommendations. Returns structured PropertyAnalysis with per-photo
 * assessments and a prioritized action plan.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 * @see packages/shared/src/schemas/ai-responses.ts — PropertyAnalysisSchema
 */

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { serializeError } from "../../config/errors.js";
import { openAiConnector } from "../../connectors/openai.connector.js";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_PROMPT_VERSION,
  buildAnalysisUserPrompt,
  PropertyAnalysisSchema,
  type AiMetadata,
  type AiResult,
  type PropertyAnalysis,
} from "@str-renovator/shared";

interface AnalyzeInput {
  buffers: Buffer[];
  filenames: string[];
  context?: string;
  userPrompt?: string;
}

export async function analyzeProperty(
  input: AnalyzeInput
): Promise<AiResult<PropertyAnalysis>> {
  const imageContent = input.buffers.map((buffer) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const promptText = input.userPrompt ??
    buildAnalysisUserPrompt(input.filenames.length, input.context);

  logger.info({ model: env.openaiChatModel, imageCount: input.buffers.length, filenames: input.filenames }, "calling OpenAI for property analysis");

  const response = await openAiConnector.chatCompletion({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userMessage: [
      { type: "text", text: promptText },
      ...imageContent,
    ],
    model: env.openaiChatModel,
    maxTokens: 4096,
  });

  const content = response.content;
  if (!content) {
    logger.error({ model: response.model }, "empty response from analysis model");
    throw new Error("Empty response from analysis model");
  }

  logger.info({ responseLength: content.length, model: response.model, tokensUsed: response.usage.totalTokens }, "OpenAI analysis response received");

  const cleaned = content.replace(/```json\s*|```/g, "").trim();
  let jsonParsed: unknown;
  try {
    jsonParsed = JSON.parse(cleaned);
  } catch (parseErr) {
    logger.error({ rawContent: cleaned.substring(0, 500), err: serializeError(parseErr) }, "analysis response JSON parse failed");
    throw new Error(`Analysis response is not valid JSON: ${serializeError(parseErr)}`);
  }

  const parsed = PropertyAnalysisSchema.safeParse(jsonParsed);
  if (!parsed.success) {
    logger.error({ zodErrors: parsed.error.issues }, "analysis response Zod validation failed");
    throw new Error(`AI response validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    promptVersion: ANALYSIS_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
