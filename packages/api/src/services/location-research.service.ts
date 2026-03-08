import { openai } from "../config/openai.js";
import { env } from "../config/env.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import {
  LOCATION_RESEARCH_SYSTEM_PROMPT,
  LOCATION_RESEARCH_PROMPT_VERSION,
  buildLocationResearchPrompt,
  LocationProfileSchema,
  type AiMetadata,
  type AiResult,
} from "@str-renovator/shared";

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
  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: env.openaiChatModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LOCATION_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: buildLocationResearchPrompt(input) },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    })
  );

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from location research");

  const parsed = LocationProfileSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Location research validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: LOCATION_RESEARCH_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
