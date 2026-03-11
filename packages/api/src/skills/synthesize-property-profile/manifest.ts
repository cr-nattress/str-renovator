/**
 * @module synthesize-property-profile/manifest
 * @capability Skill manifest for property profile synthesis
 * @layer Execution
 */

import { PROPERTY_SYNTHESIS_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const SYNTHESIZE_PROPERTY_PROFILE_MANIFEST: SkillManifest = {
  id: "synthesize-property-profile",
  name: "Synthesize Property Profile",
  description:
    "Merges scraped listing data, location profile, and review analysis into a unified property intelligence profile with competitive positioning and renovation priorities.",
  promptVersion: PROPERTY_SYNTHESIS_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Scraped listing data object, location profile object, and optional review analysis object.",
  outputDescription:
    "Unified property profile JSON: property_summary, capacity, pricing, target_guests, competitive_positioning, amenity_gaps, renovation_priorities, and design_direction.",
  temperature: 0.4,
  tags: ["synthesis", "intelligence", "profile"],
} as const;
