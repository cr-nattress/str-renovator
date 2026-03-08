import { openai } from "../config/openai.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import {
  LISTING_EXTRACTION_SYSTEM_PROMPT,
  LISTING_EXTRACTION_PROMPT_VERSION,
  buildListingExtractionPrompt,
  ListingDataSchema,
  type AiMetadata,
  type AiResult,
} from "@str-renovator/shared";

export async function extractListingData(
  pageContent: string,
  listingUrl: string
): Promise<AiResult<Record<string, unknown>>> {
  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LISTING_EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildListingExtractionPrompt(pageContent, listingUrl),
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    })
  );

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from listing extraction");

  const parsed = ListingDataSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Listing extraction validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: LISTING_EXTRACTION_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
