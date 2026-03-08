/**
 * @module create-analysis-photos
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates analysis_photos rows by matching AI results to actual photos
 * from successful batches. Uses filename matching with positional fallback.
 */

import { supabase } from "../../config/supabase.js";
import type { DbPhoto, PropertyAnalysis } from "@str-renovator/shared";

export interface AnalysisPhotoRecord {
  id: string;
  renovations: string;
}

export async function createAnalysisPhotos(
  analysisId: string,
  analysis: PropertyAnalysis,
  typedPhotos: DbPhoto[]
): Promise<AnalysisPhotoRecord[]> {
  const { data: successfulBatches } = await supabase
    .from("analysis_batches")
    .select("photo_ids, filenames")
    .eq("analysis_id", analysisId)
    .eq("status", "completed")
    .order("batch_index");

  const successfulPhotoIds = new Set(
    (successfulBatches ?? []).flatMap((b: any) => b.photo_ids as string[])
  );

  const allBatchFilenames: string[] = (successfulBatches ?? []).flatMap(
    (b: any) => b.filenames as string[]
  );

  const analysisPhotoIds: AnalysisPhotoRecord[] = [];

  for (let i = 0; i < analysis.photos.length; i++) {
    const photoAnalysis = analysis.photos[i];

    let matchedPhoto = typedPhotos.find(
      (p) => p.filename === photoAnalysis.filename
    );

    if (!matchedPhoto && i < allBatchFilenames.length) {
      matchedPhoto = typedPhotos.find(
        (p) => p.filename === allBatchFilenames[i]
      );
    }

    if (!matchedPhoto) continue;
    if (!successfulPhotoIds.has(matchedPhoto.id)) continue;

    const { data: analysisPhoto, error: apError } = await supabase
      .from("analysis_photos")
      .insert({
        analysis_id: analysisId,
        photo_id: matchedPhoto.id,
        room: photoAnalysis.room,
        strengths: photoAnalysis.strengths,
        renovations: photoAnalysis.renovations,
        priority: photoAnalysis.priority,
      })
      .select("id")
      .single();

    if (apError || !analysisPhoto) continue;
    analysisPhotoIds.push({
      id: analysisPhoto.id,
      renovations: photoAnalysis.renovations,
    });
  }

  return analysisPhotoIds;
}
