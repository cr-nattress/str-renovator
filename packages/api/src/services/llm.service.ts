/**
 * @module llm.service
 * @capability Generic JSON chat completion helper
 * @layer Execution
 *
 * Eliminates boilerplate across AI service files by encapsulating the
 * rate-limited OpenAI call, response extraction, Zod validation, and
 * metadata construction in a single reusable function.
 */

import type { z } from "zod";
import { env } from "../config/env.js";
import { openAiConnector } from "../connectors/openai.connector.js";
import type { AiMetadata, AiResult } from "@str-renovator/shared";

interface JsonChatCompletionOptions<T extends z.ZodTypeAny> {
  systemPrompt: string;
  userMessage: string;
  schema: T;
  promptVersion: string;
  temperature?: number;
  maxTokens?: number;
  errorLabel: string;
}

/** Executes a rate-limited JSON chat completion, validates with Zod, and returns typed data + metadata */
export async function executeJsonChatCompletion<T extends z.ZodTypeAny>(
  options: JsonChatCompletionOptions<T>
): Promise<AiResult<z.infer<T>>> {
  const {
    systemPrompt,
    userMessage,
    schema,
    promptVersion,
    temperature = 0.3,
    maxTokens = 4096,
    errorLabel,
  } = options;

  const response = await openAiConnector.chatCompletion({
    systemPrompt,
    userMessage,
    model: env.openaiChatModel,
    temperature,
    maxTokens,
    responseFormat: { type: "json_object" },
  });

  const text = response.content;
  if (!text) throw new Error(`No response from ${errorLabel}`);

  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`${errorLabel} validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage.totalTokens,
    promptVersion,
  };

  return { data: parsed.data, metadata };
}
