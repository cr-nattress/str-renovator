/**
 * @module process-batches
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates batch records, processes them with concurrency limiting,
 * and tracks completion/failure counts via atomic increments.
 */

import pLimit from "p-limit";
import * as batchService from "../../services/batch.service.js";
import { CONCURRENCY, type DbPhoto } from "@str-renovator/shared";
import type { Logger } from "pino";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import { serializeError } from "../../config/errors.js";

export interface BatchResult {
  completedCount: number;
  failedCount: number;
}

export async function processBatches(
  analysisId: string,
  typedPhotos: DbPhoto[],
  context: string | undefined,
  log: Logger
): Promise<BatchResult> {
  const batches = await batchService.createBatchRecords(
    analysisId,
    typedPhotos,
    CONCURRENCY.analysisBatchSize
  );

  await analysisRepo.updateStatus(analysisId, "analyzing", { total_batches: batches.length });

  const limit = pLimit(CONCURRENCY.analysisBatchConcurrency);
  let completedCount = 0;
  let failedCount = 0;

  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        try {
          await batchService.processSingleBatch(
            batch,
            typedPhotos,
            context,
            batches.length
          );
          completedCount++;
          await analysisRepo.incrementCounter("completed_batches", analysisId);
        } catch (err) {
          failedCount++;
          await analysisRepo.incrementCounter("failed_batches", analysisId);
          log.error(
            { batchIndex: batch.batch_index, err: serializeError(err) },
            "batch failed"
          );
        }
      })
    )
  );

  if (completedCount === 0) {
    throw new Error(
      `All ${batches.length} batches failed. Analysis cannot proceed.`
    );
  }

  return { completedCount, failedCount };
}
