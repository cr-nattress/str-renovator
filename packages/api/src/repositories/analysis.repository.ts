import { supabase } from "../config/supabase.js";
import type { DbAnalysis } from "@str-renovator/shared";
import { logger } from "../config/logger.js";

export async function create(data: {
  property_id: string;
  user_id: string;
  status: string;
  total_photos: number;
}): Promise<DbAnalysis> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert(data)
    .select()
    .single();
  if (error || !analysis) throw error ?? new Error("Failed to create analysis");
  return analysis as DbAnalysis;
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<DbAnalysis | null> {
  const { data } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as DbAnalysis) ?? null;
}

export async function findByIdWithPhotos(
  id: string,
  userId: string
): Promise<(DbAnalysis & { analysis_photos: unknown[] }) | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*, analysis_photos(*, photos(*))")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    logger.error({ analysisId: id, err: error.message, code: error.code }, "findByIdWithPhotos query failed");
    return null;
  }
  if (!data) return null;
  return data as DbAnalysis & { analysis_photos: unknown[] };
}

export async function listByPropertyAndUser(
  propertyId: string,
  userId: string
): Promise<DbAnalysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbAnalysis[];
}

export async function findOwnershipCheck(
  id: string,
  userId: string
): Promise<{ id: string; user_id: string } | null> {
  const { data } = await supabase
    .from("analyses")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function getStreamData(id: string): Promise<{
  status: string;
  completed_photos: number;
  total_photos: number;
  total_batches: number;
  completed_batches: number;
  failed_batches: number;
  error: string | null;
} | null> {
  const { data } = await supabase
    .from("analyses")
    .select("status, completed_photos, total_photos, total_batches, completed_batches, failed_batches, error")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("analyses")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw error;
}

export async function updateFields(
  id: string,
  fields: Partial<Pick<DbAnalysis, "property_assessment" | "style_direction">>
): Promise<DbAnalysis> {
  const { data, error } = await supabase
    .from("analyses")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to update analysis");
  return data as DbAnalysis;
}

export async function updateById(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("analyses")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function findLatestByProperty(
  propertyId: string,
  userId: string
): Promise<{ id: string; status: string; created_at: string } | null> {
  const { data } = await supabase
    .from("analyses")
    .select("id, status, created_at")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function archive(id: string): Promise<void> {
  const { error } = await supabase
    .from("analyses")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export async function incrementCounter(
  column: string,
  id: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("increment_counter", {
    p_table: "analyses",
    p_column: column,
    p_id: id,
  });
  if (error) throw error;
  return data;
}
