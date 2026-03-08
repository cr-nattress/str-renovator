/**
 * @module create-analysis-photos
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates analysis_photos rows by matching AI results to actual photos
 * from successful batches. Uses filename matching with positional fallback.
 */

import type { DbPhoto, PropertyAnalysis } from "@str-renovator/shared";
import * as analysisBatchRepo from "../../repositories/analysis-batch.repository.js";
import * as analysisPhotoRepo from "../../repositories/analysis-photo.repository.js";

export interface AnalysisPhotoRecord {
  id: string;
  renovations: string;
}

export async function createAnalysisPhotos(
  analysisId: string,
  analysis: PropertyAnalysis,
  typedPhotos: DbPhoto[]
): Promise<AnalysisPhotoRecord[]> {
  const successfulBatches = await analysisBatchRepo.listSuccessful(analysisId);

  const successfulPhotoIds = new Set(
    successfulBatches.flatMap((b) => b.photo_ids as string[])
  );

  const allBatchFilenames: string[] = successfulBatches.flatMap(
    (b) => b.filenames as string[]
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

    try {
      const analysisPhoto = await analysisPhotoRepo.create({
        analysis_id: analysisId,
        photo_id: matchedPhoto.id,
        room: photoAnalysis.room,
        strengths: photoAnalysis.strengths,
        renovations: photoAnalysis.renovations,
        priority: photoAnalysis.priority,
      });

      analysisPhotoIds.push({
        id: analysisPhoto.id,
        renovations: photoAnalysis.renovations,
      });
    } catch {
      continue;
    }
  }

  return analysisPhotoIds;
}
