import sharp from "sharp";
import { openai, toFile } from "../config/openai.js";
import { imageGenerationLimiter } from "../config/rate-limiter.js";
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
  const file = await toFile(pngBuffer, pngFilename, { type: "image/png" });

  const response = await imageGenerationLimiter(() =>
    openai.images.edit({
      model: "dall-e-2",
      image: file,
      prompt: input.rawPrompt ? input.prompt : buildImageEditPrompt(input.prompt),
      size: "1024x1024",
      response_format: "b64_json",
    })
  );

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("No image data returned from renovation");

  const metadata: AiMetadata = {
    model: "dall-e-2",
    tokensUsed: 0,
    promptVersion: input.rawPrompt ? ACTION_IMAGE_PROMPT_VERSION : IMAGE_EDIT_PROMPT_VERSION,
  };

  return { data: base64, metadata };
}
