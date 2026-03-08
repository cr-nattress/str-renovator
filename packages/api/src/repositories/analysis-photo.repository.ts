import { supabase } from "../config/supabase.js";
import type { DbAnalysisPhoto } from "@str-renovator/shared";

export async function create(data: {
  analysis_id: string;
  photo_id: string;
  room: string;
  strengths: string[];
  renovations: string;
  priority: string;
}): Promise<DbAnalysisPhoto> {
  const { data: ap, error } = await supabase
    .from("analysis_photos")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return ap as DbAnalysisPhoto;
}

export async function listByAnalysis(
  analysisId: string
): Promise<DbAnalysisPhoto[]> {
  const { data, error } = await supabase
    .from("analysis_photos")
    .select("*")
    .eq("analysis_id", analysisId);
  if (error) throw error;
  return (data ?? []) as DbAnalysisPhoto[];
}

export async function findByIdWithPhoto(
  id: string
): Promise<(DbAnalysisPhoto & { photos: { storage_path: string; filename: string } }) | null> {
  const { data } = await supabase
    .from("analysis_photos")
    .select("*, photos(storage_path, filename)")
    .eq("id", id)
    .single();
  return data as any ?? null;
}

export async function updateReport(
  id: string,
  report: string
): Promise<void> {
  const { error } = await supabase
    .from("analysis_photos")
    .update({ report })
    .eq("id", id);
  if (error) throw error;
}
