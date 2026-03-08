import { openai } from "../config/openai.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import {
  PROPERTY_SYNTHESIS_SYSTEM_PROMPT,
  PROPERTY_SYNTHESIS_PROMPT_VERSION,
  buildPropertySynthesisPrompt,
  PropertyProfileSchema,
  type AiMetadata,
  type AiResult,
} from "@str-renovator/shared";

export async function synthesizePropertyProfile(input: {
  scrapedData: Record<string, unknown>;
  locationProfile: Record<string, unknown>;
  propertyName?: string;
}): Promise<AiResult<Record<string, unknown>>> {
  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROPERTY_SYNTHESIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildPropertySynthesisPrompt(
            input.scrapedData,
            input.locationProfile,
            input.propertyName
          ),
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    })
  );

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from property synthesis");

  const parsed = PropertyProfileSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Property synthesis validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: PROPERTY_SYNTHESIS_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
