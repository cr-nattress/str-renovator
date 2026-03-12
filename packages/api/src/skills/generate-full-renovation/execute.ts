/**
 * @module generate-full-renovation/execute
 * @capability Composite full-renovation image generation
 * @layer Execution
 *
 * Generates a single DALL-E image showing all action items for a room
 * applied together. Uses the same image edit pipeline as the individual
 * action item images.
 *
 * @see packages/shared/src/prompts/index.ts — buildFullRenovationPrompt
 */

import sharp from "sharp";
import { env } from "../../config/env.js";
import { openAiConnector } from "../../connectors/openai.connector.js";
import {
  buildFullRenovationPrompt,
  FULL_RENOVATION_PROMPT_VERSION,
  type AiMetadata,
  type AiResult,
  type ImageQuality,
  type ImageSize,
} from "@str-renovator/shared";

interface FullRenovationInput {
  buffer: Buffer;
  filename: string;
  actionDescriptions: string[];
  room: string;
  styleDirection: string;
  constraints?: string[];
  quality: ImageQuality;
  size: ImageSize;
}

export async function generateFullRenovation(
  input: FullRenovationInput,
): Promise<AiResult<string>> {
  const pngBuffer = await sharp(input.buffer).ensureAlpha().png().toBuffer();
  const pngFilename = input.filename.replace(/\.\w+$/, ".png");

  const prompt = buildFullRenovationPrompt(
    input.actionDescriptions,
    input.room,
    input.styleDirection,
    input.constraints,
  );

  const response = await openAiConnector.imageEdit({
    image: pngBuffer,
    filename: pngFilename,
    prompt,
    model: env.openaiImageModel,
    size: "1024x1024",
    responseFormat: "b64_json",
  });

  const base64 = response.b64Json;
  if (!base64) throw new Error("No image data returned from full renovation generation");

  const metadata: AiMetadata = {
    model: env.openaiImageModel,
    tokensUsed: 0,
    promptVersion: FULL_RENOVATION_PROMPT_VERSION,
  };

  return { data: base64, metadata };
}
