/**
 * @module aggregate-batch-analyses/manifest
 * @capability Skill manifest for batch analysis aggregation
 * @layer Execution
 */

import { AGGREGATION_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const AGGREGATE_BATCH_ANALYSES_MANIFEST: SkillManifest = {
  id: "aggregate-batch-analyses",
  name: "Aggregate Batch Analyses",
  description:
    "Combines multiple batch analysis results into a single cohesive PropertyAnalysis. Unifies property assessments, merges photo arrays, and deduplicates the action plan.",
  promptVersion: AGGREGATION_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Array of partial PropertyAnalysis objects from individual batch runs.",
  outputDescription:
    "Single merged PropertyAnalysis JSON with unified assessment, merged photos, and deduplicated/re-prioritized action plan.",
  temperature: 0.3,
  tags: ["aggregation", "batch", "synthesis"],
} as const;
