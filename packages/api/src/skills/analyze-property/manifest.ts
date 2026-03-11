/**
 * @module analyze-property/manifest
 * @capability Skill manifest for property photo analysis
 * @layer Execution
 */

import { ANALYSIS_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const ANALYZE_PROPERTY_MANIFEST: SkillManifest = {
  id: "analyze-property",
  name: "Analyze Property Photos",
  description:
    "Vision-based analysis of STR listing photos. Identifies room types, design strengths, renovation opportunities, and generates a prioritized action plan with cost estimates.",
  promptVersion: ANALYSIS_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Array of property listing photos (JPEG/PNG/WebP) with optional user-provided context and per-photo metadata (tags, constraints).",
  outputDescription:
    "PropertyAnalysis JSON: property_assessment, style_direction, per-photo renovations with tags/constraints, and a prioritized action_plan.",
  temperature: 0.4,
  maxTokens: 4096,
  tags: ["vision", "analysis", "renovation", "core"],
} as const;
