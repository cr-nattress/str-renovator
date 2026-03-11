/**
 * @module connectors
 * @capability Connector abstractions barrel export
 * @layer Execution
 *
 * Re-exports all connector interfaces and their default implementations.
 */

// Interfaces
export type {
  AiConnector,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ImageEditOptions,
  ImageEditResponse,
} from "./ai.connector.js";

export type { StorageConnector } from "./storage.connector.js";

export type {
  QueueConnector,
  QueueJobOptions,
} from "./queue.connector.js";

// Implementations
export { openAiConnector } from "./openai.connector.js";
export { supabaseStorageConnector } from "./supabase-storage.connector.js";
export { bullMqConnector } from "./bullmq.connector.js";
