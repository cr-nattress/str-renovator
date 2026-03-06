import { openai } from "../config/openai.js";
import {
  REPORT_SYSTEM_PROMPT,
  buildReportUserPrompt,
} from "@str-renovator/shared";

export async function generateTextReport(
  renovations: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: buildReportUserPrompt(renovations) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from report model");
  return content;
}
