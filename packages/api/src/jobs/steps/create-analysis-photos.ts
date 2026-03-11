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
import * as photoRepo from "../../repositories/photo.repository.js";
import { logger } from "../../config/logger.js";
import { serializeError } from "../../config/errors.js";

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

  logger.info(
    {
      analysisId,
      aiPhotoCount: analysis.photos.length,
      aiFilenames: analysis.photos.map(p => p.filename),
      dbPhotoCount: typedPhotos.length,
      dbFilenames: typedPhotos.map(p => p.filename),
      successfulBatchCount: successfulBatches.length,
      successfulPhotoCount: successfulPhotoIds.size,
      batchFilenames: allBatchFilenames,
    },
    "matching AI photo results to database photos"
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

    if (!matchedPhoto) {
      logger.warn(
        { analysisId, filename: photoAnalysis.filename, index: i },
        "no matching photo found for AI result — skipping"
      );
      continue;
    }
    if (!successfulPhotoIds.has(matchedPhoto.id)) {
      logger.warn(
        { analysisId, photoId: matchedPhoto.id, filename: matchedPhoto.filename },
        "matched photo not in successful batch — skipping"
      );
      continue;
    }

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

      // Update photo tags and constraints from AI analysis
      const photoUpdate: Record<string, unknown> = {};
      if (photoAnalysis.tags?.length) photoUpdate.tags = photoAnalysis.tags;
      if (photoAnalysis.constraints?.length) photoUpdate.constraints = photoAnalysis.constraints;

      if (Object.keys(photoUpdate).length > 0) {
        try {
          await photoRepo.update(matchedPhoto.id, photoUpdate);
        } catch (updateErr) {
          logger.warn(
            { analysisId, photoId: matchedPhoto.id, err: serializeError(updateErr) },
            "failed to update photo tags/constraints (non-fatal)"
          );
        }
      }
    } catch (err) {
      logger.error(
        { analysisId, photoId: matchedPhoto.id, err: serializeError(err) },
        "failed to create analysis photo record"
      );
      continue;
    }
  }

  logger.info(
    { analysisId, created: analysisPhotoIds.length, aiResults: analysis.photos.length, skipped: analysis.photos.length - analysisPhotoIds.length },
    "analysis photo creation complete"
  );

  return analysisPhotoIds;
}
