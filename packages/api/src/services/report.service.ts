import { openai } from "../config/openai.js";
import { env } from "../config/env.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import {
  REPORT_SYSTEM_PROMPT,
  REPORT_PROMPT_VERSION,
  buildReportUserPrompt,
  type AiMetadata,
  type AiResult,
} from "@str-renovator/shared";

export async function generateTextReport(
  renovations: string
): Promise<AiResult<string>> {
  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: env.openaiChatModel,
      max_tokens: 2048,
      messages: [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        { role: "user", content: buildReportUserPrompt(renovations) },
      ],
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from report model");

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: REPORT_PROMPT_VERSION,
  };

  return { data: content, metadata };
}
