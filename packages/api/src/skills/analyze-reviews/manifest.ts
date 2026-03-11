/**
 * @module analyze-reviews/manifest
 * @capability Skill manifest for guest review analysis
 * @layer Execution
 */

import { REVIEW_ANALYSIS_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const ANALYZE_REVIEWS_MANIFEST: SkillManifest = {
  id: "analyze-reviews",
  name: "Analyze Guest Reviews",
  description:
    "Analyzes guest reviews from STR listings. Extracts sentiment, recurring themes, strengths, concerns, memorable quotes, and actionable improvement opportunities.",
  promptVersion: REVIEW_ANALYSIS_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Raw text content of guest reviews from a listing page, with optional property name.",
  outputDescription:
    "Review analysis JSON: review_summary, overall_sentiment, strengths, concerns, memorable_quotes, themes, and improvement_opportunities.",
  temperature: 0.3,
  tags: ["sentiment", "reviews", "analysis"],
} as const;
