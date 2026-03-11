/**
 * @module ai.connector
 * @capability AI connector interface
 * @layer Execution
 *
 * Defines the contract for AI capabilities (chat completions, image editing).
 * Implementations wrap specific providers (OpenAI, Anthropic, etc.) behind
 * this interface for testability and swappability.
 *
 * @see openai.connector.ts — OpenAI implementation
 */

export interface ChatCompletionOptions {
  systemPrompt: string;
  userMessage: string | Array<{ type: string; [key: string]: unknown }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}

export interface ChatCompletionResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface ImageEditOptions {
  image: Buffer;
  filename: string;
  prompt: string;
  model?: string;
  size?: string;
  responseFormat?: string;
}

export interface ImageEditResponse {
  url?: string;
  b64Json?: string;
}

export interface AiConnector {
  chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;
  imageEdit(options: ImageEditOptions): Promise<ImageEditResponse>;
}
