/**
 * @module fetch-context
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Fetches property context and photos for an analysis job.
 */

import type { DbPhoto, DbProperty } from "@str-renovator/shared";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import * as propertyRepo from "../../repositories/property.repository.js";
import * as photoRepo from "../../repositories/photo.repository.js";

export interface AnalysisContext {
  typedPhotos: DbPhoto[];
  context: string | undefined;
}

export async function fetchAnalysisContext(
  analysisId: string,
  propertyId: string
): Promise<AnalysisContext> {
  await analysisRepo.updateStatus(analysisId, "analyzing");

  const property = await propertyRepo.findById(propertyId);

  const photos = await photoRepo.listByProperty(propertyId);

  if (!photos || photos.length === 0) {
    throw new Error("No photos found for property");
  }

  return {
    typedPhotos: photos,
    context: (property as DbProperty)?.context ?? undefined,
  };
}
