/**
 * @module extract-listing-data/execute
 * @capability Listing data extraction skill
 * @layer Execution
 *
 * Extracts structured property data from raw listing page text via GPT-4o
 * with JSON mode. Returns a normalized object of listing fields.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 * @see packages/shared/src/schemas/ai-responses.ts — ListingDataSchema
 */

import {
  LISTING_EXTRACTION_SYSTEM_PROMPT,
  LISTING_EXTRACTION_PROMPT_VERSION,
  buildListingExtractionPrompt,
  ListingDataSchema,
  type AiResult,
} from "@str-renovator/shared";
import { executeJsonChatCompletion } from "../../services/llm.service.js";

export async function extractListingData(
  pageContent: string,
  listingUrl: string
): Promise<AiResult<Record<string, unknown>>> {
  return executeJsonChatCompletion({
    systemPrompt: LISTING_EXTRACTION_SYSTEM_PROMPT,
    userMessage: buildListingExtractionPrompt(pageContent, listingUrl),
    schema: ListingDataSchema,
    promptVersion: LISTING_EXTRACTION_PROMPT_VERSION,
    temperature: 0.2,
    errorLabel: "listing extraction",
  });
}
