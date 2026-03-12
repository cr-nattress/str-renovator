import { supabase } from "../config/supabase.js";
import type { DbAnalysisBatch } from "@str-renovator/shared";

export async function insertMany(
  rows: Array<{
    analysis_id: string;
    batch_index: number;
    photo_ids: string[];
    filenames: string[];
    status: string;
  }>
): Promise<DbAnalysisBatch[]> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .insert(rows)
    .select();
  if (error || !data) throw new Error(`Failed to create batch records: ${error?.message}`);
  return data as DbAnalysisBatch[];
}

export async function updateStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("analysis_batches")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw error;
}

export async function listCompleted(
  analysisId: string
): Promise<DbAnalysisBatch[]> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .select("*")
    .eq("analysis_id", analysisId)
    .eq("status", "completed")
    .order("batch_index");
  if (error || !data || data.length === 0) {
    throw new Error("No completed batches to aggregate");
  }
  return data as DbAnalysisBatch[];
}

export async function listByAnalysis(
  analysisId: string
): Promise<DbAnalysisBatch[]> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("batch_index");
  if (error) throw error;
  return (data ?? []) as DbAnalysisBatch[];
}

export async function resetFailed(
  analysisId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .update({ status: "pending", error: null })
    .eq("analysis_id", analysisId)
    .eq("status", "failed")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function listSuccessful(
  analysisId: string
): Promise<DbAnalysisBatch[]> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .select("*")
    .eq("analysis_id", analysisId)
    .eq("status", "completed")
    .order("batch_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbAnalysisBatch[];
}
