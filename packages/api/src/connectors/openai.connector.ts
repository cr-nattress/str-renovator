/**
 * @module openai.connector
 * @capability OpenAI AI connector implementation
 * @layer Execution
 *
 * Wraps the OpenAI client and rate limiters behind the AiConnector interface.
 * Handles chat completions (with rate limiting via p-limit) and image editing
 * (with separate concurrency control).
 *
 * @see ai.connector.ts — interface definition
 * @see config/openai.ts — OpenAI client singleton
 * @see config/rate-limiter.ts — concurrency limiters
 */

import { openai, toFile } from "../config/openai.js";
import {
  chatCompletionLimiter,
  imageGenerationLimiter,
} from "../config/rate-limiter.js";
import type {
  AiConnector,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ImageEditOptions,
  ImageEditResponse,
} from "./ai.connector.js";

class OpenAiConnector implements AiConnector {
  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const messages: Array<{ role: "system" | "user"; content: unknown }> = [
      { role: "system", content: options.systemPrompt },
    ];

    if (typeof options.userMessage === "string") {
      messages.push({ role: "user", content: options.userMessage });
    } else {
      messages.push({ role: "user", content: options.userMessage });
    }

    const response = await chatCompletionLimiter(() =>
      openai.chat.completions.create({
        model: options.model ?? "gpt-4o",
        messages: messages as Parameters<
          typeof openai.chat.completions.create
        >[0]["messages"],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.responseFormat && {
          response_format: options.responseFormat,
        }),
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content in chat completion response");

    return {
      content,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
    };
  }

  async imageEdit(options: ImageEditOptions): Promise<ImageEditResponse> {
    const file = await toFile(options.image, options.filename, {
      type: "image/png",
    });

    const response = await imageGenerationLimiter(() =>
      openai.images.edit({
        model: options.model ?? "dall-e-2",
        image: file,
        prompt: options.prompt,
        size: (options.size as "1024x1024" | "256x256" | "512x512") ??
          "1024x1024",
        response_format:
          (options.responseFormat as "url" | "b64_json") ?? "b64_json",
      })
    );

    return {
      url: response.data?.[0]?.url ?? undefined,
      b64Json: response.data?.[0]?.b64_json ?? undefined,
    };
  }
}

export const openAiConnector: AiConnector = new OpenAiConnector();
