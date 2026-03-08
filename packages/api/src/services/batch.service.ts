import { openai } from "../config/openai.js";
import { env } from "../config/env.js";
import { chatCompletionLimiter } from "../config/rate-limiter.js";
import * as analysisService from "./analysis.service.js";
import * as storageService from "./storage.service.js";
import * as analysisBatchRepo from "../repositories/analysis-batch.repository.js";
import {
  AGGREGATION_SYSTEM_PROMPT,
  AGGREGATION_PROMPT_VERSION,
  buildBatchAnalysisUserPrompt,
  PropertyAnalysisSchema,
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
  // Mark batch as processing
  await analysisBatchRepo.updateStatus(batch.id, "processing");

  try {
    // Download photo buffers for this batch
    const batchPhotos = photos.filter((p) => batch.photo_ids.includes(p.id));
    const buffers: Buffer[] = [];
    const filenames: string[] = [];
    for (const photo of batchPhotos) {
      const buffer = await storageService.downloadPhoto(photo.storage_path);
      buffers.push(buffer);
      filenames.push(photo.filename);
    }

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
    const { data: result, metadata } = await analysisService.analyzeProperty({
      buffers,
      filenames,
      userPrompt,
    });

    // Mark batch as completed with AI metadata
    await analysisBatchRepo.updateStatus(batch.id, "completed", {
      result_json: result as any,
      prompt_version: metadata.promptVersion,
      model: metadata.model,
      tokens_used: metadata.tokensUsed,
    });

    return { data: result, metadata };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await analysisBatchRepo.updateStatus(batch.id, "failed", { error: message });
    throw err;
  }
}

/** Aggregates batch results into a single PropertyAnalysis */
export async function aggregateBatchResults(
  analysisId: string
): Promise<AiResult<PropertyAnalysis>> {
  const batches = await analysisBatchRepo.listCompleted(analysisId);

  const results = batches.map(
    (b: any) => b.result_json as PropertyAnalysis
  );

  // If only one batch succeeded, use its result directly (reuse batch metadata)
  if (results.length === 1) {
    const batch = batches[0] as any;
    const metadata: AiMetadata = {
      model: batch.model ?? env.openaiChatModel,
      tokensUsed: batch.tokens_used ?? 0,
      promptVersion: batch.prompt_version ?? AGGREGATION_PROMPT_VERSION,
    };
    return { data: results[0], metadata };
  }

  // Multiple batches — call GPT-4o to merge
  const batchSummaries = results.map((r, i) => ({
    batch: i + 1,
    property_assessment: r.property_assessment,
    style_direction: r.style_direction,
    photos: r.photos,
    action_plan: r.action_plan,
  }));

  const response = await chatCompletionLimiter(() =>
    openai.chat.completions.create({
      model: env.openaiChatModel,
      max_tokens: 4096,
      messages: [
        { role: "system", content: AGGREGATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here are the batch analysis results to merge:\n\n${JSON.stringify(batchSummaries, null, 2)}`,
        },
      ],
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from aggregation model");

  const cleaned = content.replace(/```json\s*|```/g, "").trim();
  const parsed = PropertyAnalysisSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Aggregation response validation failed: ${parsed.error.message}`);
  }

  const metadata: AiMetadata = {
    model: response.model,
    tokensUsed: response.usage?.total_tokens ?? 0,
    promptVersion: AGGREGATION_PROMPT_VERSION,
  };

  return { data: parsed.data, metadata };
}
