/**
 * @module skills
 * @capability Capability Registry — Skill Manifests
 * @layer Shared (contract layer)
 *
 * Declarative registry of all AI skills in the platform.
 * Each entry describes the skill's identity, model, prompt version, and
 * classification tags. Prompt versions are imported from the prompts module
 * so they stay in sync — never hardcoded here.
 *
 * Consumers: CLI help generation, MCP tool discovery, agent self-discovery,
 * admin dashboards, audit trail.
 */

import {
  ANALYSIS_PROMPT_VERSION,
  LISTING_EXTRACTION_PROMPT_VERSION,
  LOCATION_RESEARCH_PROMPT_VERSION,
  REVIEW_ANALYSIS_PROMPT_VERSION,
  PROPERTY_SYNTHESIS_PROMPT_VERSION,
  REPORT_PROMPT_VERSION,
  IMAGE_EDIT_PROMPT_VERSION,
  AGGREGATION_PROMPT_VERSION,
} from "../prompts/index.js";

/** Describes a single AI skill registered in the platform. */
export interface SkillManifest {
  /** Unique kebab-case identifier. */
  id: string;
  /** Human-readable skill name. */
  name: string;
  /** What the skill does and when to use it. */
  description: string;
  /** Version constant imported from prompts module. */
  promptVersion: string;
  /** AI model used for inference. */
  model: string;
  /** Plain-language description of expected input. */
  inputDescription: string;
  /** Plain-language description of output shape. */
  outputDescription: string;
  /** Sampling temperature override (omit to use model default). */
  temperature?: number;
  /** Max token limit for the response. */
  maxTokens?: number;
  /** Classification tags for filtering and discovery. */
  tags: string[];
}

/**
 * Central registry of every AI skill the platform exposes.
 *
 * @see packages/api/src/jobs/ for BullMQ workers that invoke these skills
 * @see packages/api/src/services/ for service wrappers around model calls
 */
export const SKILL_REGISTRY = [
  {
    id: "analyze-property",
    name: "Analyze Property Photos",
    description:
      "Vision-based analysis of STR listing photos. Identifies room types, design strengths, renovation opportunities, and generates a prioritized action plan with cost estimates.",
    promptVersion: ANALYSIS_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Array of property listing photos (JPEG/PNG/WebP) with optional user-provided context and per-photo metadata (tags, constraints).",
    outputDescription: "PropertyAnalysis JSON: property_assessment, style_direction, per-photo renovations with tags/constraints, and a prioritized action_plan.",
    temperature: 0.4,
    maxTokens: 4096,
    tags: ["vision", "analysis", "renovation", "core"],
  },
  {
    id: "extract-listing-data",
    name: "Extract Listing Data",
    description:
      "Extracts structured property data from raw listing page text. Pulls title, amenities, pricing, capacity, location, and host details into a normalized JSON object.",
    promptVersion: LISTING_EXTRACTION_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Raw text content scraped from a listing page plus the source URL.",
    outputDescription: "Flat JSON object with normalized listing fields (title, bedrooms, amenities, pricing, etc.). Keys with no data are omitted.",
    temperature: 0.2,
    tags: ["extraction", "scraping", "data"],
  },
  {
    id: "research-location",
    name: "Research Location",
    description:
      "Generates a comprehensive STR location intelligence profile. Covers area type, guest demographics, seasonal patterns, nearby attractions, and design recommendations tailored to the locale.",
    promptVersion: LOCATION_RESEARCH_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Property address fields (city, state, zip, country) and optional property name/type.",
    outputDescription: "Location profile JSON: area_type, area_bio, guest_demographics, seasonal_patterns, local_attractions, design_recommendations, and host tips.",
    temperature: 0.5,
    tags: ["research", "location", "intelligence"],
  },
  {
    id: "analyze-reviews",
    name: "Analyze Guest Reviews",
    description:
      "Analyzes guest reviews from STR listings. Extracts sentiment, recurring themes, strengths, concerns, memorable quotes, and actionable improvement opportunities.",
    promptVersion: REVIEW_ANALYSIS_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Raw text content of guest reviews from a listing page, with optional property name.",
    outputDescription: "Review analysis JSON: review_summary, overall_sentiment, strengths, concerns, memorable_quotes, themes, and improvement_opportunities.",
    temperature: 0.3,
    tags: ["sentiment", "reviews", "analysis"],
  },
  {
    id: "synthesize-property-profile",
    name: "Synthesize Property Profile",
    description:
      "Merges scraped listing data, location profile, and review analysis into a unified property intelligence profile with competitive positioning and renovation priorities.",
    promptVersion: PROPERTY_SYNTHESIS_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Scraped listing data object, location profile object, and optional review analysis object.",
    outputDescription: "Unified property profile JSON: property_summary, capacity, pricing, target_guests, competitive_positioning, amenity_gaps, renovation_priorities, and design_direction.",
    temperature: 0.4,
    tags: ["synthesis", "intelligence", "profile"],
  },
  {
    id: "generate-text-report",
    name: "Generate Text Report",
    description:
      "Produces a structured prose report explaining renovation recommendations for a single listing photo. Each item includes a 'Why it matters' rationale for STR context.",
    promptVersion: REPORT_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Renovation instructions text for a single photo.",
    outputDescription: "Numbered prose report with each renovation paired with an STR-focused rationale.",
    temperature: 0.5,
    tags: ["prose", "report", "generation"],
  },
  {
    id: "edit-image",
    name: "Edit Listing Photo",
    description:
      "Applies AI-generated visual renovations to a listing photo using DALL-E. Supports iterative refinement via user feedback from previous iterations.",
    promptVersion: IMAGE_EDIT_PROMPT_VERSION,
    model: "dall-e-2",
    inputDescription: "Original listing photo (PNG), renovation instructions text, and optional feedback context from prior iterations.",
    outputDescription: "Renovated photo (PNG) with the requested changes applied while preserving room layout, perspective, and realistic lighting.",
    tags: ["visual", "image-editing", "renovation"],
  },
  {
    id: "aggregate-batch-analyses",
    name: "Aggregate Batch Analyses",
    description:
      "Combines multiple batch analysis results into a single cohesive PropertyAnalysis. Unifies property assessments, merges photo arrays, and deduplicates the action plan.",
    promptVersion: AGGREGATION_PROMPT_VERSION,
    model: "gpt-4o",
    inputDescription: "Array of partial PropertyAnalysis objects from individual batch runs.",
    outputDescription: "Single merged PropertyAnalysis JSON with unified assessment, merged photos, and deduplicated/re-prioritized action plan.",
    temperature: 0.3,
    tags: ["aggregation", "batch", "synthesis"],
  },
] as const satisfies readonly SkillManifest[];

/** Skill ID union type derived from the registry. */
export type SkillId = (typeof SKILL_REGISTRY)[number]["id"];
