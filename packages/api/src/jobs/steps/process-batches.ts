/**
 * @module process-batches
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates batch records, processes them with concurrency limiting,
 * and tracks completion/failure counts via atomic increments.
 *
 * In retry mode, reuses existing batch records and only processes
 * pending/failed batches — previously completed batches are skipped.
 */

import pLimit from "p-limit";
import * as batchService from "../../services/batch.service.js";
import * as analysisBatchRepo from "../../repositories/analysis-batch.repository.js";
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
  log: Logger,
  retry: boolean = false
): Promise<BatchResult> {
  let batches;

  if (retry) {
    // Retry mode: use existing batch records, only process pending/failed
    const allBatches = await analysisBatchRepo.listByAnalysis(analysisId);
    batches = allBatches.filter((b) => b.status === "pending" || b.status === "failed");
    log.info({ totalBatches: allBatches.length, retryBatches: batches.length }, "retry mode: processing pending/failed batches only");

    if (batches.length === 0) {
      log.info("no batches to retry — all already completed");
      return { completedCount: 0, failedCount: 0 };
    }

    // Reset status to analyzing (counters were already reset by the command)
    await analysisRepo.updateStatus(analysisId, "analyzing");
  } else {
    // Normal mode: create new batch records
    batches = await batchService.createBatchRecords(
      analysisId,
      typedPhotos,
      CONCURRENCY.analysisBatchSize
    );
    await analysisRepo.updateStatus(analysisId, "analyzing", { total_batches: batches.length });
  }

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

  if (completedCount === 0 && !retry) {
    throw new Error(
      `All ${batches.length} batches failed. Analysis cannot proceed.`
    );
  }

  // In retry mode, even if all retried batches fail again, there may still be
  // previously-completed batches — so don't throw. The aggregation step will
  // determine if there's enough data to proceed.

  return { completedCount, failedCount };
}
