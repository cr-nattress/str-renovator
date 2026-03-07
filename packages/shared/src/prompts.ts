import type { PropertyAnalysis } from "./types.js";

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
  "Return your analysis as JSON matching this exact structure (no markdown fences, just raw JSON):",
  JSON.stringify(
    {
      property_assessment:
        "Overall vibe, strengths, design coherence, and weaknesses...",
      style_direction:
        "Recommended overall style direction for the property...",
      photos: [
        {
          filename: "photo_01.jpeg",
          room: "Living Room",
          strengths: ["example strength 1", "example strength 2"],
          renovations:
            "Specific renovation instructions for this photo. Be detailed and actionable.",
          priority: "high",
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
  styleDirection: string
): string {
  return [
    "You are editing a real estate listing photo for a short-term rental (Airbnb/VRBO).",
    "Apply ONLY the single specific change described below to this photo.",
    "Keep everything else in the room exactly as-is — same layout, perspective, lighting, and furnishings.",
    "The result should look like a professional real estate photo — not AI-generated.",
    "",
    `Room: ${room}`,
    `Style direction: ${styleDirection}`,
    "",
    "Change to apply:",
    actionItem,
  ].join("\n");
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
  context?: string
): string {
  const contextLine = context
    ? `\n\nProperty context provided by the owner: ${context}`
    : "";
  const batchNote = totalBatches > 1
    ? ` This is batch ${batchIndex + 1} of ${totalBatches} — you are seeing a subset of the property's photos. Analyze only these ${photoCount} photos.`
    : "";
  return `Analyze the following ${photoCount} listing photos for this property and provide your complete assessment.${batchNote}${contextLine}`;
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
