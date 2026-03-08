import { openai } from "../config/openai.js";
import { env } from "../config/env.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_PROMPT_VERSION,
  buildAnalysisUserPrompt,
  PropertyAnalysisSchema,
  type AiMetadata,
  type AiResult,
  type PropertyAnalysis,
} from "@str-renovator/shared";

interface AnalyzeInput {
  buffers: Buffer[];
  filenames: string[];
  context?: string;
  userPrompt?: string;
}

export async function analyzeProperty(
  input: AnalyzeInput
): Promise<AiResult<PropertyAnalysis>> {
  const imageContent = input.buffers.map((buffer, i) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const promptText = input.userPrompt ??
    buildAnalysisUserPrompt(input.filenames.length, input.context);

  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: env.openaiChatModel,
      max_tokens: 4096,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            ...imageContent,
          ],
        },
      ],
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from analysis model");

  const cleaned = content.replace(/```json\s*|```/g, "").trim();
  const parsed = PropertyAnalysisSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`AI response validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: ANALYSIS_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
