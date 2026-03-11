/**
 * @module research-location/manifest
 * @capability Skill manifest for location research
 * @layer Execution
 */

import { LOCATION_RESEARCH_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const RESEARCH_LOCATION_MANIFEST: SkillManifest = {
  id: "research-location",
  name: "Research Location",
  description:
    "Generates a comprehensive STR location intelligence profile. Covers area type, guest demographics, seasonal patterns, nearby attractions, and design recommendations tailored to the locale.",
  promptVersion: LOCATION_RESEARCH_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Property address fields (city, state, zip, country) and optional property name/type.",
  outputDescription:
    "Location profile JSON: area_type, area_bio, guest_demographics, seasonal_patterns, local_attractions, design_recommendations, and host tips.",
  temperature: 0.5,
  tags: ["research", "location", "intelligence"],
} as const;
