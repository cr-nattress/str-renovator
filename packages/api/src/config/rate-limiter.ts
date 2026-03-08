import pLimit from "p-limit";
import { CONCURRENCY } from "@str-renovator/shared";

/**
 * @module rate-limiter
 * @capability Rate limiting for OpenAI API calls
 * @layer Execution
 *
 * Uses p-limit to enforce concurrency limits on OpenAI API calls,
 * preventing rate limit errors from overwhelming the API.
 */

/** Concurrency limiter for OpenAI chat completion calls */
export const chatCompletionLimiter = pLimit(5);

/** Concurrency limiter for OpenAI image generation/edit calls */
export const imageGenerationLimiter = pLimit(CONCURRENCY.imagesPerMinute);
