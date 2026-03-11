/**
 * @module edit-image/execute
 * @capability AI image editing skill
 * @layer Execution
 *
 * Applies AI-generated visual renovations to a listing photo using DALL-E.
 * Converts input to RGBA PNG, sends to the image edit API, and returns
 * the result as base64.
 *
 * @see packages/shared/src/prompts/index.ts — prompt constants
 */

import sharp from "sharp";
import { env } from "../../config/env.js";
import { openAiConnector } from "../../connectors/openai.connector.js";
import {
  buildImageEditPrompt,
  IMAGE_EDIT_PROMPT_VERSION,
  ACTION_IMAGE_PROMPT_VERSION,
  type AiMetadata,
  type AiResult,
  type ImageQuality,
  type ImageSize,
} from "@str-renovator/shared";

interface RenovateInput {
  buffer: Buffer;
  filename: string;
  prompt: string;
  quality: ImageQuality;
  size: ImageSize;
  rawPrompt?: boolean;
}

export async function editImage(input: RenovateInput): Promise<AiResult<string>> {
  // Convert to RGBA PNG (dall-e-2 requires PNG with alpha channel)
  const pngBuffer = await sharp(input.buffer).ensureAlpha().png().toBuffer();
  const pngFilename = input.filename.replace(/\.\w+$/, ".png");

  const response = await openAiConnector.imageEdit({
    image: pngBuffer,
    filename: pngFilename,
    prompt: input.rawPrompt ? input.prompt : buildImageEditPrompt(input.prompt),
    model: env.openaiImageModel,
    size: "1024x1024",
    responseFormat: "b64_json",
  });

  const base64 = response.b64Json;
  if (!base64) throw new Error("No image data returned from renovation");

  const metadata: AiMetadata = {
    model: env.openaiImageModel,
    tokensUsed: 0,
    promptVersion: input.rawPrompt ? ACTION_IMAGE_PROMPT_VERSION : IMAGE_EDIT_PROMPT_VERSION,
  };

  return { data: base64, metadata };
}
