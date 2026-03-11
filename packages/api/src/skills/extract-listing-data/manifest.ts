/**
 * @module extract-listing-data/manifest
 * @capability Skill manifest for listing data extraction
 * @layer Execution
 */

import { LISTING_EXTRACTION_PROMPT_VERSION } from "@str-renovator/shared";
import type { SkillManifest } from "@str-renovator/shared";

export const EXTRACT_LISTING_DATA_MANIFEST: SkillManifest = {
  id: "extract-listing-data",
  name: "Extract Listing Data",
  description:
    "Extracts structured property data from raw listing page text. Pulls title, amenities, pricing, capacity, location, and host details into a normalized JSON object.",
  promptVersion: LISTING_EXTRACTION_PROMPT_VERSION,
  model: "gpt-4o",
  inputDescription:
    "Raw text content scraped from a listing page plus the source URL.",
  outputDescription:
    "Flat JSON object with normalized listing fields (title, bedrooms, amenities, pricing, etc.). Keys with no data are omitted.",
  temperature: 0.2,
  tags: ["extraction", "scraping", "data"],
} as const;
