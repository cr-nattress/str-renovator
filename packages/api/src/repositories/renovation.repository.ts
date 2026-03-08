import { supabase } from "../config/supabase.js";
import type { DbRenovation } from "@str-renovator/shared";

export async function listByAnalysisPhoto(
  analysisPhotoId: string,
  userId: string
): Promise<DbRenovation[]> {
  const { data, error } = await supabase
    .from("renovations")
    .select("*")
    .eq("analysis_photo_id", analysisPhotoId)
    .eq("user_id", userId)
    .order("iteration", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbRenovation[];
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<DbRenovation | null> {
  const { data } = await supabase
    .from("renovations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as DbRenovation) ?? null;
}

export async function findOwnershipCheck(
  id: string,
  userId: string
): Promise<{ id: string; user_id: string } | null> {
  const { data } = await supabase
    .from("renovations")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function countByAnalysisPhoto(
  analysisPhotoId: string
): Promise<number> {
  const { count } = await supabase
    .from("renovations")
    .select("*", { count: "exact", head: true })
    .eq("analysis_photo_id", analysisPhotoId);
  return count ?? 0;
}

export async function listIdsByAnalysisPhoto(
  analysisPhotoId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("renovations")
    .select("id")
    .eq("analysis_photo_id", analysisPhotoId);
  return (data ?? []).map((r: any) => r.id);
}

export async function create(data: {
  analysis_photo_id: string;
  user_id: string;
  iteration: number;
  parent_renovation_id?: string | null;
  feedback_context?: string | null;
  status: string;
}): Promise<DbRenovation> {
  const { data: renovation, error } = await supabase
    .from("renovations")
    .insert(data)
    .select()
    .single();
  if (error || !renovation) throw error ?? new Error("Failed to create renovation");
  return renovation as DbRenovation;
}

export async function insertMany(
  rows: Array<{
    analysis_photo_id: string;
    user_id: string;
    status: string;
    iteration: number;
  }>
): Promise<DbRenovation[]> {
  const { data, error } = await supabase
    .from("renovations")
    .insert(rows)
    .select();
  if (error) throw error;
  return (data ?? []) as DbRenovation[];
}

export async function updateStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("renovations")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw error;
}
