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
import { logger } from "../../config/logger.js";

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
  if (!property) {
    logger.error({ analysisId, propertyId }, "property not found during analysis context fetch");
    throw new Error(`Property ${propertyId} not found`);
  }

  const photos = await photoRepo.listByProperty(propertyId);

  if (!photos || photos.length === 0) {
    logger.error({ analysisId, propertyId }, "no photos found for property");
    throw new Error("No photos found for property");
  }

  logger.info(
    { analysisId, propertyId, photoCount: photos.length, filenames: photos.map(p => p.filename) },
    "analysis context fetched"
  );

  return {
    typedPhotos: photos,
    context: (property as DbProperty)?.context ?? undefined,
  };
}
