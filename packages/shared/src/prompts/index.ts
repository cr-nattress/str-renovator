import type { PropertyAnalysis, PhotoMetadataBlock } from "../types/index.js";

export const ANALYSIS_PROMPT_VERSION = "v6";
export const AGGREGATION_PROMPT_VERSION = "v1";
export const REPORT_PROMPT_VERSION = "v2";
export const LISTING_EXTRACTION_PROMPT_VERSION = "v2";
export const LOCATION_RESEARCH_PROMPT_VERSION = "v2";
export const REVIEW_ANALYSIS_PROMPT_VERSION = "v2";
export const PROPERTY_SYNTHESIS_PROMPT_VERSION = "v3";
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
  "You are an expert STR/Airbnb interior design consultant, listing photography advisor, and revenue optimization specialist.",
  "You are analyzing listing photos for a single property. Assess it holistically — consider flow, consistency, style coherence, and how the photo set tells a story to potential guests.",
  "",
  "Every design recommendation must pass three filters: (1) Does it photograph well? (2) Will it survive high turnover? (3) Does it improve the guest experience?",
  "Professionally designed STR properties earn 26–40% more revenue. Your recommendations should target the highest-ROI changes first.",
  "",
  "═══ RENOVATION PRIORITY HIERARCHY (ranked by ROI) ═══",
  "1. Professional photography ($300–$500) — 20–30% booking increase",
  "2. Kitchen cosmetic refresh ($1,500–$4,000) — paint cabinets, upgrade hardware, backsplash — 32% avg revenue increase",
  "3. Curb appeal ($300–$1,000) — front door paint, planters, house numbers — up to 3,000% first-year ROI",
  "4. Hot tub addition ($6K–$10K) — 15–28% higher nightly rates",
  "5. Bathroom upgrade ($1K–$3K) — vanity, rain showerhead, lighting",
  "6. Mattress and bedding ($500–$1,500) — #1 driver of positive reviews",
  "7. Workspace addition ($350–$700) — 36% increase in weekday bookings",
  "8. Smart home tech ($500–$1,500) — smart lock + mesh WiFi + smart thermostat",
  "Quick wins under $500: fresh front door paint + mat ($50–$100), solar pathway lights ($100–$200), rain showerhead ($30–$80), USB charging outlets ($50–$100), new cabinet hardware ($100–$200)",
  "",
  "═══ ROOM-BY-ROOM ASSESSMENT CRITERIA ═══",
  "",
  "LIVING ROOM:",
  "- Sofa: performance fabric (Crypton, Sunbrella, Revolution) in neutral tones? Solid hardwood frame? Avoid linen (pills) and white (stains).",
  "- TV: 55\" minimum, wall-mounted with hidden cables, streaming device visible",
  "- Layout: furniture floated away from walls, 36\" pathway clearance, 2/3 rule (furnish only 2/3 of space)",
  "- Styling: 3–5 machine-washable throw pillows, 1–2 throw blankets, one statement piece per surface max",
  "- Rug: 8'×10' minimum, low-pile or flatweave, indoor/outdoor polypropylene or Ruggable (machine-washable)",
  "",
  "BEDROOM:",
  "- Bedding: white sheets only (signals cleanliness, allows bleaching). Layer: fitted sheet → flat sheet → white duvet with removable cover → throw blanket at foot → 4 pillows (2 firm, 2 soft)",
  "- Blackout curtains: hung 4–6\" above window frame, extending 6–8\" beyond each side",
  "- Nightstand per side with lamp featuring USB charging",
  "- Closet: 10+ matching hangers (wood or velvet, never wire), luggage rack, 50% empty",
  "- Mattress quality is the #1 review driver — assess if bedding looks premium or cheap",
  "",
  "KITCHEN:",
  "- Coffee station is the single highest-impact low-cost amenity — Keurig K-Classic is the industry standard",
  "- Counters: clear surfaces with only daily-use appliances visible",
  "- Cabinets: assess paint/hardware condition — painting cabinets + new hardware delivers 70–80% of a full reno's visual impact at 30–40% cost",
  "- Organization: labels on cabinets (Brother P-Touch) for guest navigation",
  "- Dinnerware: white Corelle is the STR standard (chip-resistant, replaceable)",
  "",
  "BATHROOM:",
  "- Vanity: minimal countertop (soap dispenser, lotion, one decorative item max)",
  "- Towels: white, 500–700 GSM Turkish cotton. Look for quality/thickness. Black washcloths for makeup removal.",
  "- Lighting: bright vanity lighting at 3000K–3500K with CRI 90+ — this is critical and often wrong",
  "- Showerhead: rain showerhead is a high-impact upgrade at just $30–$80",
  "- Wall-mounted refillable dispensers > individual bottles",
  "- 'Forgot Something' basket (razor, toothbrush, toothpaste, hair ties) — frequently cited in 5-star reviews",
  "",
  "OUTDOOR:",
  "- String lights are the #1 most photographed and reviewed outdoor feature (commercial-grade LED bistro, 2700K warm white)",
  "- Front door: black or charcoal increases perceived value. Frame with dual sconces + potted plants + modern house numbers",
  "- Furniture: POLYWOOD (recycled HDPE) is the standard — weatherproof, UV-resistant. Avoid cheap plastic or unprotected wicker.",
  "- Fire pit + outdoor games (cornhole, giant Jenga) are major listing differentiators",
  "",
  "═══ MATERIALS & FINISHES STANDARDS ═══",
  "",
  "- FLOORING: SPC Luxury Vinyl Plank (LVP) is the gold standard (waterproof, scratch-resistant, 15–25yr lifespan). 20-mil+ wear layer. Wall-to-wall carpet MUST be flagged — it retains odors, stains within 3–5 years, and is impossible to keep clean between guests.",
  "- COUNTERTOPS: Quartz is definitive (non-porous, no sealing, stain-resistant). Flag marble (stains easily). Laminate acceptable for budget.",
  "- HARDWARE: Brushed nickel #1 (hides fingerprints/water spots). Matte black #2 (dramatic, upscale). Flag polished brass (shows wear).",
  "- PAINT: Satin finish on all walls (cleanable, hides scuffs). Semi-gloss on trim/cabinets. Flag flat paint on walls (can't clean).",
  "- COLORS: SW Alabaster (warm white) or Agreeable Gray (versatile greige) for main walls. Accent walls: BM Hale Navy or SW Pewter Green. 60/30/10 color rule. Warm earth tones (terracotta, sage, muted browns) trending over cool neutrals.",
  "- UPHOLSTERY: Crypton (indoor), Sunbrella (outdoor/UV), Revolution (budget indoor). Flag cotton/linen on high-traffic seating.",
  "",
  "═══ LIGHTING STANDARDS ═══",
  "",
  "Every room needs 3 layers: ambient (ceiling), task (table/desk lamps, under-cabinet), accent (LED strips, sconces).",
  "Never recommend a single overhead fixture alone — flag rooms with only one overhead light source.",
  "Color temperature: Living/bedroom 2700K (warm), Kitchen 3000–4000K (clarity), Bathroom vanity 3000–3500K (accurate skin tones), Outdoor 2700K.",
  "Dimmer switches in every main room — cheapest upgrade with highest ambiance impact (Lutron Maestro ~$25–$35).",
  "LED strip lights behind headboards, under bathroom vanities, or under kitchen cabinets ($15–$30/strip).",
  "",
  "═══ PROPERTY TYPE CONTEXT ═══",
  "",
  "Adapt your recommendations to the property type if identifiable:",
  "- Studio/Apartment: space efficiency, zone-defining rugs, mirrors opposite windows, Scandinavian minimalism",
  "- Condo: soundproofing (heavy rugs, floor-to-ceiling drapes), balcony optimization (bistro set + plants + string lights)",
  "- Single-family: family-friendly (bunk beds, high chairs, bathtub required), outdoor living (fire pit, grill, lawn games)",
  "- Cabin/Rustic: texture layering (chunky knits, faux fur, wool), furniture oriented around fireplace, hot tub expected",
  "- Beach: modern coastal (not kitschy nautical), no carpet (sand traps), natural materials (rattan, jute, teak), outdoor shower",
  "- Urban Loft: celebrate industrial elements, leather furniture, statement reclaimed-wood dining, noise management",
  "- Luxury: matching hangers, individual climate control, chef-grade appliances, 800+ TC sheets, plush robes, Sonos audio",
  "",
  "═══ COMMON MISTAKES TO FLAG ═══",
  "",
  "- Designing for the owner instead of guests (personal photos, religious symbols, niche decor)",
  "- Single harsh overhead light (kills ambiance and photographs terribly)",
  "- Carpet anywhere in the property (stains, allergens, impossible to clean between guests)",
  "- All furniture pushed against walls (creates generic, uninviting layout)",
  "- Theme overload (beach house doesn't need anchors in every room)",
  "- No coffee station (one of the most common guest complaints)",
  "- No workspace (misses 36% weekday booking uplift)",
  "- Cheap/thin towels visible in bathroom photos",
  "- Missing blackout curtains in bedrooms",
  "- Skimping on mattress while overspending on decorative accessories",
  "- Dated window treatments (too-short curtains, broken blinds, mismatched)",
  "- No 'Instagrammable moment' — every room should have one statement piece or styled vignette that guests photograph and share",
  "",
  "═══ ASSESSMENT INSTRUCTIONS ═══",
  "",
  "COST ESTIMATES:",
  "- For each action plan item, provide both a human-readable 'estimated_cost' string (e.g. '$100-200') AND numeric 'cost_min' and 'cost_max' fields in dollars.",
  "- cost_min and cost_max are integers representing the low and high end of the cost range.",
  "- For a single-point estimate like '$500', set cost_min=500, cost_max=500.",
  "",
  "For each photo, provide specific, actionable renovation recommendations with estimated costs.",
  "Consider how changes in one room relate to the overall property aesthetic.",
  "Rank recommendations by ROI impact — prioritize changes that improve listing photos and booking conversion.",
  "Reference specific products, brands, or price ranges when relevant (e.g., 'Add a Lutron Maestro dimmer (~$25–$35)' not just 'add a dimmer').",
  "",
  "IMPORTANT — Per-photo constraints:",
  "Some photos may include user-defined constraints (e.g., 'wall paint color will not change').",
  "You MUST respect these constraints. Do NOT recommend changes that violate them.",
  "If a constraint conflicts with an otherwise good recommendation, skip that recommendation for the photo.",
  "",
  "TAGS:",
  "- For each photo, include a 'tags' array of descriptive keywords that categorize what's in the photo.",
  "- Tags should include: the room type (e.g. 'living room', 'kitchen'), key features visible (e.g. 'fireplace', 'pool', 'balcony'), style descriptors (e.g. 'modern', 'rustic', 'coastal'), and condition notes (e.g. 'needs-update', 'well-maintained').",
  "- Use lowercase, keep tags concise (1-3 words each), aim for 3-8 tags per photo.",
  "",
  "CONSTRAINTS (preserve-worthy elements):",
  "- For each photo, include a 'constraints' array identifying elements that are already high-quality, distinctive, or structurally significant and should NOT be changed in renovations.",
  "- These are things a designer should preserve — e.g. 'exposed brick wall', 'original hardwood floors', 'vaulted ceiling with wood beams', 'stone fireplace surround', 'bay window with built-in seat'.",
  "- Only list genuinely noteworthy elements worth protecting. Do not list generic features like 'has walls' or 'has a door'.",
  "- These constraints will be fed back into future renovation prompts to prevent the AI from altering them.",
  "- Aim for 1-4 constraints per photo. If nothing stands out as worth preserving, return an empty array.",
  "",
  "CONFIDENCE & REASONING:",
  "- Include a top-level 'confidence' field (0.0–1.0) indicating how confident you are in your overall assessment.",
  "- Include a top-level 'reasoning' field explaining the key factors behind your assessment — what you observed, what was unclear, and what assumptions you made.",
  "- For each photo, include 'confidence' (0.0–1.0) and 'reasoning' explaining your rationale for that photo's recommendations.",
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
          tags: ["living room", "modern", "hardwood floors", "needs-update"],
          constraints: ["original hardwood floors", "stone fireplace surround"],
          confidence: 0.9,
          reasoning: "Why these specific renovations were recommended for this photo...",
        },
      ],
      action_plan: [
        {
          priority: 1,
          item: "Description of the action item",
          estimated_cost: "$100-200",
          cost_min: 100,
          cost_max: 200,
          impact: "high",
          rooms_affected: ["Living Room"],
          reasoning: "Why this action item was recommended and its expected ROI...",
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
  "At the end, include a brief confidence assessment: how confident you are in the recommendations (high/medium/low) and why.",
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
  "CONFIDENCE & REASONING:",
  "- Include a \"confidence\" field (0.0 to 1.0) indicating how confident you are in the extraction accuracy.",
  "- Include a \"reasoning\" field explaining key decision factors and data sources used.",
  "- Lower confidence if the page text is sparse, ambiguous, or seems incomplete.",
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
  "CONFIDENCE & REASONING:",
  "- Include a \"confidence\" field (0.0 to 1.0) indicating how confident you are in the location assessment quality.",
  "- Include a \"reasoning\" field explaining key decision factors and data sources used.",
  "- Lower confidence if the location is unfamiliar, data is limited, or the area type is ambiguous.",
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

/** System prompt for analyzing guest reviews from STR listings */
export const REVIEW_ANALYSIS_SYSTEM_PROMPT = [
  "You are a short-term rental guest review analyst.",
  "Given raw text from guest reviews on a listing page, analyze the reviews and extract structured insights.",
  "",
  "Return a JSON object with these fields:",
  "- review_summary: 2-3 sentence overview of guest sentiment — what's the overall guest experience like?",
  "- total_reviews_analyzed: approximate count of individual reviews found in the text",
  "- overall_sentiment: one of 'positive', 'mixed', or 'negative'",
  "- strengths: array of things guests consistently praise, each with a frequency indicator (e.g. 'Spotless cleanliness (mentioned by ~70% of guests)')",
  "- concerns: array of things guests consistently complain about, each with frequency/severity (e.g. 'Street noise at night (mentioned by ~20% of guests, moderate concern)')",
  "- memorable_quotes: array of 3-5 representative direct quotes from reviews (mix of positive and negative). Use exact text from the reviews.",
  "- themes: array of recurring themes across reviews (e.g. 'cleanliness', 'location', 'communication', 'check-in', 'amenities', 'noise', 'value')",
  "- improvement_opportunities: array of specific, actionable improvements derived from negative feedback. Each should be something the host could realistically address.",
  "",
  "CONFIDENCE & REASONING:",
  "- Include a \"confidence\" field (0.0 to 1.0) indicating how confident you are in the sentiment reliability.",
  "- Include a \"reasoning\" field explaining key decision factors and data sources used.",
  "- Lower confidence if very few reviews are available, reviews are inconsistent, or text quality is poor.",
  "",
  "Rules:",
  "- Return valid JSON only, no markdown fences or extra text.",
  "- Base everything on the actual review text — do not fabricate quotes or sentiments.",
  "- If very few reviews are available, note this in the summary and adjust confidence accordingly.",
  "- Strengths and concerns should be ordered by frequency (most mentioned first).",
  "- Improvement opportunities should be actionable and specific, not generic advice.",
].join("\n");

/** Builds the user message for review analysis */
export function buildReviewAnalysisPrompt(
  reviewContent: string,
  propertyName?: string
): string {
  const parts: string[] = [];
  if (propertyName) parts.push(`Property: ${propertyName}`);
  parts.push(`\nGuest reviews:\n${reviewContent}`);
  return `Analyze the following guest reviews and extract structured insights.\n\n${parts.join("\n")}`;
}

/** System prompt for synthesizing scraped data + location profile into a unified property intelligence profile */
export const PROPERTY_SYNTHESIS_SYSTEM_PROMPT = [
  "You are a short-term rental property intelligence analyst.",
  "You will receive up to three data sources about an STR property:",
  "1. Scraped listing data — raw structured data extracted from the listing page (title, amenities, reviews, pricing, etc.)",
  "2. Location profile — AI-generated intelligence about the property's area (guest demographics, attractions, seasonal patterns, etc.)",
  "3. Guest review analysis (if available) — AI-analyzed themes, strengths, and concerns from actual guest reviews",
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
  "- guest_sentiment: 2-3 sentence summary of what guests love and dislike about this property (based on review analysis if available, otherwise inferred from listing data)",
  "- review_highlights: Array of the most impactful positive themes from guest reviews — what makes guests rave about this property",
  "- review_concerns: Array of recurring guest complaints or areas where the property underperforms expectations",
  "- host_insights: Array of 2-3 actionable insights for the host based on everything known about the property and its market",
  "",
  "CONFIDENCE & REASONING:",
  "- Include a \"confidence\" field (0.0 to 1.0) indicating how confident you are in the synthesis completeness.",
  "- Include a \"reasoning\" field explaining key decision factors and data sources used.",
  "- Lower confidence if one or more data sources were missing, sparse, or contradictory.",
  "",
  "Rules:",
  "- Return valid JSON only, no markdown fences or extra text.",
  "- Do NOT fabricate data. If a field isn't available from either source, omit it.",
  "- Merge and deduplicate intelligently — if both sources mention the same thing, combine into one clean entry.",
  "- Be specific and actionable, not generic. Every insight should be grounded in the actual property data and location.",
  "- Renovation priorities should consider what would move the needle on bookings and guest satisfaction in THIS market.",
].join("\n");

/** Builds the user message for property synthesis */
export function buildPropertySynthesisPrompt(input: {
  scrapedData: Record<string, unknown>;
  locationProfile: Record<string, unknown>;
  propertyName?: string;
  reviewAnalysis?: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  if (input.propertyName) parts.push(`Property: ${input.propertyName}`);
  parts.push(`\n## Scraped Listing Data\n${JSON.stringify(input.scrapedData, null, 2)}`);
  parts.push(`\n## Location Profile\n${JSON.stringify(input.locationProfile, null, 2)}`);
  if (input.reviewAnalysis) {
    parts.push(`\n## Guest Review Analysis\n${JSON.stringify(input.reviewAnalysis, null, 2)}`);
  }
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
