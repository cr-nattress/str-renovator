/**
 * @module synthesize-property-profile/execute
 * @capability Property profile synthesis skill
 * @layer Execution
 *
 * Merges scraped listing data, location profile, and review analysis
 * into a unified property intelligence profile via GPT-4o with JSON mode.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 * @see packages/shared/src/schemas/ai-responses.ts — PropertyProfileSchema
 */

import {
  PROPERTY_SYNTHESIS_SYSTEM_PROMPT,
  PROPERTY_SYNTHESIS_PROMPT_VERSION,
  buildPropertySynthesisPrompt,
  PropertyProfileSchema,
  type AiResult,
} from "@str-renovator/shared";
import { executeJsonChatCompletion } from "../../services/llm.service.js";

export async function synthesizePropertyProfile(input: {
  scrapedData: Record<string, unknown>;
  locationProfile: Record<string, unknown>;
  propertyName?: string;
  reviewAnalysis?: Record<string, unknown>;
}): Promise<AiResult<Record<string, unknown>>> {
  return executeJsonChatCompletion({
    systemPrompt: PROPERTY_SYNTHESIS_SYSTEM_PROMPT,
    userMessage: buildPropertySynthesisPrompt(input),
    schema: PropertyProfileSchema,
    promptVersion: PROPERTY_SYNTHESIS_PROMPT_VERSION,
    errorLabel: "property synthesis",
  });
}
