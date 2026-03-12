/**
 * @module generate-full-renovation/manifest
 * @capability Skill manifest for composite full-renovation image generation
 * @layer Execution
 */

import { FULL_RENOVATION_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const FULL_RENOVATION_MANIFEST: SkillManifest = {
  id: "generate-full-renovation",
  name: "Generate Full Renovation Image",
  description:
    "Generates a composite DALL-E image showing all recommended action items applied to a room at once. Produces the primary before/after transformation view.",
  promptVersion: FULL_RENOVATION_PROMPT_VERSION,
  model: "dall-e-2",
  inputDescription:
    "Original listing photo (PNG), array of action item descriptions for the room, room name, style direction, and optional constraints.",
  outputDescription:
    "Composite renovated photo (PNG) with all changes applied simultaneously.",
  tags: ["visual", "image-editing", "renovation", "composite"],
} as const;
