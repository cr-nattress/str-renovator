import { openai } from "../config/openai.js";
import {
  buildImageEditPrompt,
  type ImageQuality,
  type ImageSize,
} from "@str-renovator/shared";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface RenovateInput {
  buffer: Buffer;
  filename: string;
  prompt: string;
  quality: ImageQuality;
  size: ImageSize;
  rawPrompt?: boolean;
}

export async function editImage(input: RenovateInput): Promise<string> {
  // Write buffer to a temp file for the images.edit API
  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `str-renovator-${Date.now()}-${input.filename}`);
  fs.writeFileSync(tmpPath, input.buffer);

  try {
    const file = fs.createReadStream(tmpPath);
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: file,
      prompt: input.rawPrompt ? input.prompt : buildImageEditPrompt(input.prompt),
      quality: input.quality === "high" ? "high" : input.quality === "medium" ? "medium" : "low",
      size: input.size,
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) throw new Error("No image data returned from renovation");
    return base64;
  } finally {
    fs.unlinkSync(tmpPath);
  }
}
