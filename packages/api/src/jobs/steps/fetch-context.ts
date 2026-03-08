/**
 * @module fetch-context
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Fetches property context and photos for an analysis job.
 */

import { supabase } from "../../config/supabase.js";
import type { DbPhoto, DbProperty } from "@str-renovator/shared";

export interface AnalysisContext {
  typedPhotos: DbPhoto[];
  context: string | undefined;
}

export async function fetchAnalysisContext(
  analysisId: string,
  propertyId: string
): Promise<AnalysisContext> {
  await supabase
    .from("analyses")
    .update({ status: "analyzing" })
    .eq("id", analysisId);

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("*")
    .eq("property_id", propertyId);

  if (photosError || !photos || photos.length === 0) {
    throw new Error("No photos found for property");
  }

  return {
    typedPhotos: photos as DbPhoto[],
    context: (property as DbProperty)?.context ?? undefined,
  };
}
