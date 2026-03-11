import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { serializeError } from "../config/errors.js";
import { analyzeProperty } from "../skills/analyze-property/index.js";
import { aggregateBatchAnalyses } from "../skills/aggregate-batch-analyses/index.js";
import * as storageService from "./storage.service.js";
import * as analysisBatchRepo from "../repositories/analysis-batch.repository.js";
import {
  AGGREGATION_PROMPT_VERSION,
  buildBatchAnalysisUserPrompt,
  type AiMetadata,
  type AiResult,
  type DbAnalysisBatch,
  type DbPhoto,
  type PhotoMetadataBlock,
  type PropertyAnalysis,
} from "@str-renovator/shared";

/** Splits an array into chunks of the given size */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Creates batch records in the database and returns them */
export async function createBatchRecords(
  analysisId: string,
  photos: DbPhoto[],
  batchSize: number
): Promise<DbAnalysisBatch[]> {
  const photoChunks = chunk(photos, batchSize);
  const batchRows = photoChunks.map((chunkPhotos, index) => ({
    analysis_id: analysisId,
    batch_index: index,
    photo_ids: chunkPhotos.map((p) => p.id),
    filenames: chunkPhotos.map((p) => p.filename),
    status: "pending" as const,
  }));

  return analysisBatchRepo.insertMany(batchRows);
}

/** Processes a single batch: downloads photos, calls analysis, updates status */
export async function processSingleBatch(
  batch: DbAnalysisBatch,
  photos: DbPhoto[],
  context: string | undefined,
  totalBatches: number
): Promise<AiResult<PropertyAnalysis>> {
  const batchLog = logger.child({ batchId: batch.id, batchIndex: batch.batch_index, analysisId: batch.analysis_id });

  // Mark batch as processing
  await analysisBatchRepo.updateStatus(batch.id, "processing");
  batchLog.info({ photoIds: batch.photo_ids }, "batch processing started");

  try {
    // Download photo buffers for this batch
    const batchPhotos = photos.filter((p) => batch.photo_ids.includes(p.id));
    batchLog.info({ matchedPhotos: batchPhotos.length, expectedPhotos: batch.photo_ids.length }, "downloading photos");

    const buffers: Buffer[] = [];
    const filenames: string[] = [];
    for (const photo of batchPhotos) {
      try {
        const buffer = await storageService.downloadPhoto(photo.storage_path);
        buffers.push(buffer);
        filenames.push(photo.filename);
      } catch (err) {
        batchLog.error(
          { photoId: photo.id, filename: photo.filename, storagePath: photo.storage_path, err: serializeError(err) },
          "failed to download photo — skipping"
        );
      }
    }

    if (buffers.length === 0) {
      throw new Error("All photo downloads failed for batch");
    }

    batchLog.info({ downloadedCount: buffers.length, filenames }, "photos downloaded");

    // Build per-photo metadata blocks when available
    const photoMetadata: PhotoMetadataBlock[] = batchPhotos.map((p) => ({
      filename: p.filename,
      ...(p.display_name && { display_name: p.display_name }),
      ...(p.description && { description: p.description }),
      ...(p.tags?.length && { tags: p.tags }),
      ...(p.constraints?.length && { constraints: p.constraints }),
    }));
    const hasMetadata = photoMetadata.some(
      (m) => m.display_name || m.description || m.tags?.length || m.constraints?.length
    );

    // Build batch-aware prompt (include actual filenames so AI uses them)
    const userPrompt = buildBatchAnalysisUserPrompt(
      filenames.length,
      batch.batch_index,
      totalBatches,
      context,
      filenames,
      hasMetadata ? photoMetadata : undefined
    );

    // Call analysis service
    batchLog.info({ model: env.openaiChatModel, photoCount: buffers.length }, "calling OpenAI analysis");
    const { data: result, metadata } = await analyzeProperty({
      buffers,
      filenames,
      userPrompt,
    });
    batchLog.info(
      { model: metadata.model, tokensUsed: metadata.tokensUsed, resultPhotos: result.photos.length, resultFilenames: result.photos.map(p => p.filename) },
      "OpenAI analysis returned"
    );

    // Mark batch as completed with AI metadata
    await analysisBatchRepo.updateStatus(batch.id, "completed", {
      result_json: result as any,
      prompt_version: metadata.promptVersion,
      model: metadata.model,
      tokens_used: metadata.tokensUsed,
    });

    batchLog.info("batch completed successfully");
    return { data: result, metadata };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    batchLog.error({ err: message, stack }, "batch failed");
    await analysisBatchRepo.updateStatus(batch.id, "failed", { error: message });
    throw err;
  }
}

/** Aggregates batch results into a single PropertyAnalysis */
export async function aggregateBatchResults(
  analysisId: string
): Promise<AiResult<PropertyAnalysis>> {
  const batches = await analysisBatchRepo.listCompleted(analysisId);
  logger.info({ analysisId, completedBatchCount: batches.length }, "aggregating batch results");

  const results = batches.map(
    (b: any) => b.result_json as PropertyAnalysis
  );

  // For a single batch, reuse the batch's own metadata when available
  if (results.length === 1) {
    const batch = batches[0] as any;
    const metadata: AiMetadata = {
      model: batch.model ?? env.openaiChatModel,
      tokensUsed: batch.tokens_used ?? 0,
      promptVersion: batch.prompt_version ?? AGGREGATION_PROMPT_VERSION,
    };
    logger.info({ analysisId }, "single batch — using result directly, no aggregation needed");
    return { data: results[0], metadata };
  }

  // Delegate multi-batch aggregation to the skill
  return aggregateBatchAnalyses(results, analysisId);
}
