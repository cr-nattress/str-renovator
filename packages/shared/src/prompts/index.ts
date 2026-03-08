import type { PropertyAnalysis, PhotoMetadataBlock } from "../types/index.js";

export const ANALYSIS_PROMPT_VERSION = "v2";
export const AGGREGATION_PROMPT_VERSION = "v1";
export const REPORT_PROMPT_VERSION = "v1";
export const LISTING_EXTRACTION_PROMPT_VERSION = "v1";
export const LOCATION_RESEARCH_PROMPT_VERSION = "v1";
export const PROPERTY_SYNTHESIS_PROMPT_VERSION = "v1";
export const IMAGE_EDIT_PROMPT_VERSION = "v1";
export const ACTION_IMAGE_PROMPT_VERSION = "v1";

/** Wraps user renovation instructions in a system prompt for DALL-E image editing */
export function buildImageEditPrompt(userPrompt: string): string {
  return [
    "You are editing a real estate listing photo for a short-term rental (Airbnb/VRBO).",
    "Apply the following renovations to this photo while keeping the room layout, perspective, and lighting realistic and consistent.",
    "The result should look like a professional real estate photo — not AI-generated.",
    "",
    "Renovations to apply:",
    userPrompt,
  ].join("\n");
}

/** Builds an enhanced image edit prompt that incorporates user feedback from previous iterations */
export function buildFeedbackImageEditPrompt(
  originalRenovations: string,
  feedbackContext: string
): string {
  return buildImageEditPrompt(
    [
      originalRenovations,
      "",
      "IMPORTANT — The user reviewed the previous renovation and provided this feedback. Apply these adjustments:",
      feedbackContext,
    ].join("\n")
  );
}

/** System prompt for GPT-4o vision analysis of property photos */
export const ANALYSIS_SYSTEM_PROMPT = [
  "You are an expert STR/Airbnb interior design and listing photography consultant.",
  "You are analyzing ALL listing photos for a single property.",
  "Assess the property holistically — consider flow, consistency, style coherence across rooms,",
  "and how the photo set tells a story to potential guests.",
  "",
  "Pay close attention to these STR-specific details:",
  "- WINDOW TREATMENTS: Curtains, blinds, sheers — are they dated, too short, mismatched, or missing? Quality curtains dramatically elevate a space in photos.",
  "- MEDIA & ENTERTAINMENT: TV size/mounting, streaming setup, game consoles, board games, Bluetooth speakers. Guests notice and book for great entertainment setups.",
  "- ORGANIZATION & CLUTTER: Open shelves, countertop clutter, visible cords/cables, closet organization. Clean, organized spaces photograph better and signal quality.",
  '- WOW FACTOR & GUEST DELIGHTS: What makes a guest say \'wow\' or immediately screenshot for their group chat? Think statement lighting, accent walls, unique art, a record player, a espresso machine, a fire pit, luxury bedding, rain showerheads. Identify what\'s missing and what could be added.',
  "- LIGHTING: Layered lighting (ambient, task, accent) is critical. Overhead-only lighting kills the vibe. Recommend table lamps, sconces, LED strips, dimmers.",
  "- TEXTILES & COMFORT: Throw blankets, accent pillows, quality towels visible in bathrooms, rug layering. These are cheap wins that photograph beautifully.",
  "- PLANTS & GREENERY: Incorporate plants, succulents, or dried botanicals where they improve the space. A fiddle leaf fig in a living room corner, a potted snake plant on a shelf, herbs in the kitchen, or a trailing pothos on a bookshelf. Greenery adds life to photos, softens hard surfaces, and makes spaces feel fresh and cared-for. Recommend low-maintenance varieties suited to STRs (no high-care plants that will die between guests).",
  "- COHESION: Does every room feel like the same property? Mismatched styles between rooms is a common STR problem.",
  "",
  "For each photo, provide specific, actionable renovation recommendations.",
  "Consider how changes in one room relate to the overall property aesthetic.",
  "Focus on changes that are realistic, cost-effective, and will have the highest impact",
  "on guest appeal and booking conversion. Prioritize changes that will make the listing",
  "photos stand out and convert browsers into bookers.",
  "",
  "IMPORTANT — Per-photo constraints:",
  "Some photos may include user-defined constraints (e.g., 'wall paint color will not change').",
  "You MUST respect these constraints. Do NOT recommend changes that violate them.",
  "If a constraint conflicts with an otherwise good recommendation, skip that recommendation for the photo.",
  "",
  "CONFIDENCE & REASONING:",
  "- Include a top-level 'confidence' field (0.0–1.0) indicating how confident you are in your overall assessment. 0.0 = very uncertain, 1.0 = highly confident.",
  "- Include a top-level 'reasoning' field explaining the key factors behind your assessment — what you observed, what was unclear, and what assumptions you made.",
  "- For each photo, also include 'confidence' (0.0–1.0) for how confident you are in that specific photo's analysis, and 'reasoning' explaining your rationale for that photo's recommendations.",
  "- Be honest about uncertainty. Low-quality photos, ambiguous angles, or unusual spaces should lower confidence.",
  "",
  "Return your analysis as JSON matching this exact structure (no markdown fences, just raw JSON):",
  JSON.stringify(
    {
      property_assessment:
        "Overall vibe, strengths, design coherence, and weaknesses...",
      style_direction:
        "Recommended overall style direction for the property...",
      confidence: 0.85,
      reasoning: "Key factors behind the overall assessment...",
      photos: [
        {
          filename: "photo_01.jpeg",
          room: "Living Room",
          strengths: ["example strength 1", "example strength 2"],
          renovations:
            "Specific renovation instructions for this photo. Be detailed and actionable.",
          priority: "high",
          confidence: 0.9,
          reasoning: "Why these specific renovations were recommended for this photo...",
        },
      ],
      action_plan: [
        {
          priority: 1,
          item: "Description of the action item",
          estimated_cost: "$100-200",
          impact: "high",
          rooms_affected: ["Living Room"],
        },
      ],
    } satisfies PropertyAnalysis,
    null,
    2
  ),
].join("\n");

/** Builds a focused prompt for generating an action plan item preview image */
export function buildActionItemImagePrompt(
  actionItem: string,
  room: string,
  styleDirection: string,
  constraints?: string[]
): string {
  const lines = [
    "You are editing a real estate listing photo for a short-term rental (Airbnb/VRBO).",
    "Apply ONLY the single specific change described below to this photo.",
    "Keep everything else in the room exactly as-is — same layout, perspective, lighting, and furnishings.",
    "The result should look like a professional real estate photo — not AI-generated.",
  ];

  if (constraints?.length) {
    lines.push(
      "",
      "CONSTRAINTS — The owner has specified that the following aspects must NOT change:",
      ...constraints.map((c) => `- ${c}`),
      "Preserve these exactly as they appear in the original photo.",
    );
  }

  lines.push(
    "",
    `Room: ${room}`,
    `Style direction: ${styleDirection}`,
    "",
    "Change to apply:",
    actionItem,
  );

  return lines.join("\n");
}

/** System prompt for per-photo text report generation */
export const REPORT_SYSTEM_PROMPT = [
  "You are a short-term rental (STR) interior design consultant.",
  "Given a list of renovations applied to an Airbnb listing photo, produce a structured report.",
  "For each improvement, explain WHY it matters from an STR/Airbnb perspective (guest appeal, photo quality, booking conversion).",
  "Be concise and direct. Each reason should be 1-2 sentences max.",
  "Format as a numbered list. Each item has the improvement on one line, then → Why: on the next.",
].join(" ");

/** Builds the user message for text report generation */
export function buildReportUserPrompt(renovations: string): string {
  return `Here are the renovations applied to a listing photo:\n\n${renovations}\n\nGenerate the improvement report.`;
}

/** Builds the user message for the vision analysis call */
export function buildAnalysisUserPrompt(
  photoCount: number,
  context?: string
): string {
  const contextLine = context
    ? `\n\nProperty context provided by the owner: ${context}`
    : "";
  return `Analyze the following ${photoCount} listing photos for this property and provide your complete assessment.${contextLine}`;
}

/** Builds a batch-aware user prompt for vision analysis */
export function buildBatchAnalysisUserPrompt(
  photoCount: number,
  batchIndex: number,
  totalBatches: number,
  context?: string,
  filenames?: string[],
  photoMetadata?: PhotoMetadataBlock[]
): string {
  const contextLine = context
    ? `\n\nProperty context provided by the owner: ${context}`
    : "";
  const batchNote = totalBatches > 1
    ? ` This is batch ${batchIndex + 1} of ${totalBatches} — you are seeing a subset of the property's photos. Analyze only these ${photoCount} photos.`
    : "";

  let photoSection = "";
  if (photoMetadata?.length) {
    const blocks = photoMetadata.map((m, i) => {
      const lines: string[] = [`${i + 1}. ${m.filename}`];
      if (m.display_name) lines.push(`   Name: ${m.display_name}`);
      if (m.description) lines.push(`   Description: ${m.description}`);
      if (m.tags?.length) lines.push(`   Tags: ${m.tags.join(", ")}`);
      if (m.constraints?.length) lines.push(`   Constraints: ${m.constraints.join("; ")}`);
      return lines.join("\n");
    });
    photoSection = `\n\nThe photos are provided in this order. Use these EXACT filenames in your response:\n${blocks.join("\n")}`;
  } else if (filenames?.length) {
    photoSection = `\n\nThe photos are provided in this order. Use these EXACT filenames in your response:\n${filenames.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
  }

  return `Analyze the following ${photoCount} listing photos for this property and provide your complete assessment.${batchNote}${contextLine}${photoSection}`;
}

/** System prompt for extracting structured listing data from raw page text */
export const LISTING_EXTRACTION_SYSTEM_PROMPT = [
  "You are a data extraction specialist for short-term rental listings.",
  "Given the raw text content of a listing page, extract all meaningful property data into a JSON object.",
  "",
  "Use these keys when applicable (but also include any other relevant data you find):",
  "- title: The listing title/name",
  "- description: The listing description",
  "- property_type: e.g. 'Entire home', 'Private room', 'Cabin', 'Condo', etc.",
  "- bedrooms: Number of bedrooms",
  "- bathrooms: Number of bathrooms",
  "- beds: Number of beds",
  "- max_guests: Maximum number of guests",
  "- amenities: Array of amenity strings",
  "- house_rules: Array of house rule strings",
  "- check_in_time: Check-in time",
  "- check_out_time: Check-out time",
  "- address_line1: Street address if visible",
  "- city: City name",
  "- state: State or province",
  "- zip_code: ZIP or postal code",
  "- country: Country",
  "- neighborhood: Neighborhood name if mentioned",
  "- nightly_rate: Listed price per night if visible",
  "- rating: Overall rating",
  "- review_count: Number of reviews",
  "- host_name: Host name",
  "- superhost: Boolean, whether host is a superhost",
  "- highlights: Array of any listing highlights or special callouts",
  "",
  "Rules:",
  "- Return valid JSON only, no markdown fences or extra text.",
  "- Omit keys that have no data — do not include null or empty values.",
  "- If you find relevant data that doesn't fit the suggested keys, include it with a descriptive snake_case key.",
  "- Extract actual values from the text — do not fabricate or guess data.",
  "- For amenities and house_rules, extract individual items as separate array entries.",
].join("\n");

/** Builds the user message for listing data extraction */
export function buildListingExtractionPrompt(
  pageContent: string,
  listingUrl: string
): string {
  return `Extract all structured data from this listing page.\n\nURL: ${listingUrl}\n\nPage content:\n${pageContent}`;
}

/** System prompt for generating STR-focused location profiles */
export const LOCATION_RESEARCH_SYSTEM_PROMPT = [
  "You are a short-term rental location intelligence expert.",
  "Given a property's location, generate a comprehensive profile of the area that helps STR hosts understand their market and make design/amenity decisions.",
  "",
  "Return a JSON object with these sections:",
  "- area_type: One of 'urban', 'suburban', 'rural', 'beach', 'mountain', 'lake', 'desert', 'ski', 'island', or the most fitting descriptor",
  "- area_bio: 2-3 paragraph narrative describing the area's character, vibe, and what draws visitors (be specific to THIS location, not generic)",
  "- guest_demographics: Array of typical guest profiles (e.g. 'Families with young children', 'Couples on weekend getaways', 'Remote workers')",
  "- guest_behavior: What guests typically do, what they value, average stay length, booking patterns",
  "- seasonal_patterns: How demand, guest type, and activities change by season",
  "- local_attractions: Array of specific nearby attractions, restaurants, activities with approximate distances",
  "- design_recommendations: Array of specific design/decor suggestions based on the location and guest expectations",
  "- color_palette_suggestion: Suggested interior color palette that complements the area (array of color descriptions)",
  "- unique_factors: What makes this specific location unique for STR — local regulations, events, competition level",
  "- tips_for_hosts: Array of actionable tips specific to hosting in this area",
  "",
  "Rules:",
  "- Return valid JSON only, no markdown fences or extra text.",
  "- Be SPECIFIC to the actual location. Reference real neighborhoods, landmarks, restaurants, attractions.",
  "- Design recommendations should be tied to what guests in this area expect and appreciate.",
  "- If you don't have enough information about a specific aspect, provide your best assessment based on the area type and region.",
].join("\n");

/** Builds the user message for location research */
export function buildLocationResearchPrompt(input: {
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  property_name?: string;
  property_type?: string;
}): string {
  const parts: string[] = [];
  if (input.address_line1) parts.push(`Address: ${input.address_line1}`);
  if (input.city) parts.push(`City: ${input.city}`);
  if (input.state) parts.push(`State: ${input.state}`);
  if (input.zip_code) parts.push(`ZIP: ${input.zip_code}`);
  if (input.country) parts.push(`Country: ${input.country}`);
  if (input.property_name) parts.push(`Property name: ${input.property_name}`);
  if (input.property_type) parts.push(`Property type: ${input.property_type}`);
  return `Generate a comprehensive STR location profile for this property.\n\n${parts.join("\n")}`;
}

/** System prompt for synthesizing scraped data + location profile into a unified property intelligence profile */
export const PROPERTY_SYNTHESIS_SYSTEM_PROMPT = [
  "You are a short-term rental property intelligence analyst.",
  "You will receive two data sources about an STR property:",
  "1. Scraped listing data — raw structured data extracted from the listing page (title, amenities, reviews, pricing, etc.)",
  "2. Location profile — AI-generated intelligence about the property's area (guest demographics, attractions, seasonal patterns, etc.)",
  "",
  "Your job is to synthesize these into a single, comprehensive property profile that is clean, structured, and actionable.",
  "",
  "Return a JSON object with these sections:",
  "",
  "- property_summary: A 2-3 sentence narrative overview of the property — what it is, where it is, and what makes it appealing.",
  "- property_type: Normalized property type (e.g. 'Condo', 'Cabin', 'House', 'Apartment', 'Townhome')",
  "- capacity: { bedrooms, bathrooms, beds, max_guests } — integers",
  "- pricing: { nightly_rate, cleaning_fee (if available), currency } — use values from listing data",
  "- reputation: { rating, review_count, superhost } — from listing data",
  "- address: { line1, line2, city, state, zip_code, country, neighborhood } — merged from both sources",
  "- area_type: From location profile (e.g. 'mountain', 'beach', 'urban')",
  "- target_guests: Array of 3-5 guest profile strings, prioritized by likelihood for THIS specific property + location combo",
  "- competitive_positioning: 2-3 sentences on how this property sits in its local market — strengths, weaknesses, and differentiators based on its amenities, location, and pricing",
  "- amenity_highlights: Array of the most impactful amenities this property has (the ones that drive bookings in this market)",
  "- amenity_gaps: Array of amenities this property is MISSING that guests in this area typically expect or that competitors likely offer",
  "- seasonal_insights: Brief summary of how demand and guest type shift across seasons for this specific property",
  "- renovation_priorities: Array of 3-5 specific, actionable renovation/improvement priorities based on the gap between what this property offers and what its market demands. Each should be { priority: string, rationale: string, estimated_impact: 'high' | 'medium' | 'low' }",
  "- design_direction: A recommended interior design direction for this property based on its location, guest demographics, and competitive positioning. Include style name, key characteristics, and why it fits.",
  "- key_selling_points: Array of 3-5 things this property should emphasize in its listing to maximize bookings",
  "- host_insights: Array of 2-3 actionable insights for the host based on everything known about the property and its market",
  "",
  "Rules:",
  "- Return valid JSON only, no markdown fences or extra text.",
  "- Do NOT fabricate data. If a field isn't available from either source, omit it.",
  "- Merge and deduplicate intelligently — if both sources mention the same thing, combine into one clean entry.",
  "- Be specific and actionable, not generic. Every insight should be grounded in the actual property data and location.",
  "- Renovation priorities should consider what would move the needle on bookings and guest satisfaction in THIS market.",
].join("\n");

/** Builds the user message for property synthesis */
export function buildPropertySynthesisPrompt(
  scrapedData: Record<string, unknown>,
  locationProfile: Record<string, unknown>,
  propertyName?: string
): string {
  const parts: string[] = [];
  if (propertyName) parts.push(`Property: ${propertyName}`);
  parts.push(`\n## Scraped Listing Data\n${JSON.stringify(scrapedData, null, 2)}`);
  parts.push(`\n## Location Profile\n${JSON.stringify(locationProfile, null, 2)}`);
  return `Synthesize the following data sources into a unified property intelligence profile.\n\n${parts.join("\n")}`;
}

/** System prompt for aggregating batch analysis results */
export const AGGREGATION_SYSTEM_PROMPT = [
  "You are an expert STR/Airbnb interior design consultant.",
  "You previously analyzed a property's photos in multiple batches.",
  "Now you must combine those batch results into a single cohesive analysis.",
  "",
  "Your tasks:",
  "1. Write a unified property_assessment that synthesizes all batch assessments into one coherent narrative.",
  "2. Determine a single style_direction for the whole property.",
  "3. Merge all photos arrays into one (keep every photo entry unchanged).",
  "4. Merge and deduplicate the action_plan — combine similar items, re-prioritize by overall impact.",
  "",
  "Return JSON matching the exact PropertyAnalysis structure (no markdown fences).",
].join("\n");
