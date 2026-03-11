/**
 * @module generate-text-report/manifest
 * @capability Skill manifest for text report generation
 * @layer Execution
 */

import { REPORT_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const GENERATE_TEXT_REPORT_MANIFEST: SkillManifest = {
  id: "generate-text-report",
  name: "Generate Text Report",
  description:
    "Produces a structured prose report explaining renovation recommendations for a single listing photo. Each item includes a 'Why it matters' rationale for STR context.",
  promptVersion: REPORT_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription: "Renovation instructions text for a single photo.",
  outputDescription:
    "Numbered prose report with each renovation paired with an STR-focused rationale.",
  temperature: 0.5,
  tags: ["prose", "report", "generation"],
} as const;
