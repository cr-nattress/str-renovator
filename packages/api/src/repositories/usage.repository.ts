import { supabase } from "../config/supabase.js";

export interface UsageStats {
  totalTokens: number;
  totalAnalyses: number;
  totalRenovations: number;
  totalJourneyImages: number;
  byModel: { model: string; tokens: number; count: number }[];
}

/**
 * Aggregates token usage across all AI operations for a user.
 * Queries analyses, renovations, and design_journey_items tables.
 */
export async function getUsageByUser(userId: string): Promise<UsageStats> {
  const [analyses, renovations, journeyItems] = await Promise.all([
    supabase
      .from("analyses")
      .select("tokens_used, model")
      .eq("user_id", userId)
      .not("tokens_used", "is", null),
    supabase
      .from("renovations")
      .select("tokens_used, model")
      .eq("user_id", userId)
      .not("tokens_used", "is", null),
    supabase
      .from("design_journey_items")
      .select("tokens_used, model")
      .eq("user_id", userId)
      .not("tokens_used", "is", null),
  ]);

  const allRows = [
    ...(analyses.data ?? []),
    ...(renovations.data ?? []),
    ...(journeyItems.data ?? []),
  ] as { tokens_used: number; model: string | null }[];

  const modelMap = new Map<string, { tokens: number; count: number }>();

  let totalTokens = 0;
  for (const row of allRows) {
    totalTokens += row.tokens_used;
    const model = row.model ?? "unknown";
    const entry = modelMap.get(model) ?? { tokens: 0, count: 0 };
    entry.tokens += row.tokens_used;
    entry.count += 1;
    modelMap.set(model, entry);
  }

  return {
    totalTokens,
    totalAnalyses: (analyses.data ?? []).length,
    totalRenovations: (renovations.data ?? []).length,
    totalJourneyImages: (journeyItems.data ?? []).length,
    byModel: Array.from(modelMap.entries()).map(([model, { tokens, count }]) => ({
      model,
      tokens,
      count,
    })),
  };
}
