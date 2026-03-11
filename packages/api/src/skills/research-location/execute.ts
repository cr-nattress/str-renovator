/**
 * @module research-location/execute
 * @capability Location research skill
 * @layer Execution
 *
 * Generates a comprehensive STR location intelligence profile via GPT-4o
 * with JSON mode. Covers area type, guest demographics, seasonal patterns,
 * nearby attractions, and design recommendations.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 * @see packages/shared/src/schemas/ai-responses.ts — LocationProfileSchema
 */

import {
  LOCATION_RESEARCH_SYSTEM_PROMPT,
  LOCATION_RESEARCH_PROMPT_VERSION,
  buildLocationResearchPrompt,
  LocationProfileSchema,
  type AiResult,
} from "@str-renovator/shared";
import { executeJsonChatCompletion } from "../../services/llm.service.js";

export async function researchLocation(input: {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  property_name?: string;
  property_type?: string;
}): Promise<AiResult<Record<string, unknown>>> {
  return executeJsonChatCompletion({
    systemPrompt: LOCATION_RESEARCH_SYSTEM_PROMPT,
    userMessage: buildLocationResearchPrompt(input),
    schema: LocationProfileSchema,
    promptVersion: LOCATION_RESEARCH_PROMPT_VERSION,
    temperature: 0.4,
    errorLabel: "location research",
  });
}
