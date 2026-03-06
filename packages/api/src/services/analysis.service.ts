import { openai } from "../config/openai.js";
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  type PropertyAnalysis,
} from "@str-renovator/shared";

interface AnalyzeInput {
  buffers: Buffer[];
  filenames: string[];
  context?: string;
}

export async function analyzeProperty(
  input: AnalyzeInput
): Promise<PropertyAnalysis> {
  const imageContent = input.buffers.map((buffer, i) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildAnalysisUserPrompt(input.filenames.length, input.context),
          },
          ...imageContent,
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from analysis model");

  const cleaned = content.replace(/```json\s*|```/g, "").trim();
  return JSON.parse(cleaned) as PropertyAnalysis;
}
