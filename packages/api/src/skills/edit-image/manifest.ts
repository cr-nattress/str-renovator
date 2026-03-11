/**
 * @module edit-image/manifest
 * @capability Skill manifest for AI image editing
 * @layer Execution
 */

import { IMAGE_EDIT_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const EDIT_IMAGE_MANIFEST: SkillManifest = {
  id: "edit-image",
  name: "Edit Listing Photo",
  description:
    "Applies AI-generated visual renovations to a listing photo using DALL-E. Supports iterative refinement via user feedback from previous iterations.",
  promptVersion: IMAGE_EDIT_PROMPT_VERSION,
  model: "dall-e-2",
  inputDescription:
    "Original listing photo (PNG), renovation instructions text, and optional feedback context from prior iterations.",
  outputDescription:
    "Renovated photo (PNG) with the requested changes applied while preserving room layout, perspective, and realistic lighting.",
  tags: ["visual", "image-editing", "renovation"],
} as const;
