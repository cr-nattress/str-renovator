/**
 * @module process-batches
 * @capability Analysis pipeline step
 * @layer Execution
 *
 * Creates batch records, processes them with concurrency limiting,
 * and tracks completion/failure counts via atomic increments.
 */

import pLimit from "p-limit";
import { supabase } from "../../config/supabase.js";
import * as batchService from "../../services/batch.service.js";
import { CONCURRENCY, type DbPhoto } from "@str-renovator/shared";
import type { Logger } from "pino";

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

  await supabase
    .from("analyses")
    .update({ total_batches: batches.length })
    .eq("id", analysisId);

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
          await supabase.rpc("increment_counter", {
            p_table: "analyses",
            p_column: "completed_batches",
            p_id: analysisId,
          });
        } catch (err) {
          failedCount++;
          await supabase.rpc("increment_counter", {
            p_table: "analyses",
            p_column: "failed_batches",
            p_id: analysisId,
          });
          log.error(
            { batchIndex: batch.batch_index, err: err instanceof Error ? err.message : err },
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
