/**
 * @module retry-analysis-batches
 * @capability RetryAnalysisBatches command handler
 * @layer Orchestration
 *
 * Retries only the failed batches of a partially_completed or failed analysis.
 * Resets failed batch rows to pending, resets failure counters, and re-enqueues
 * the analysis job with a retry flag so the pipeline skips batch creation.
 *
 * Does NOT decrement the user's monthly analysis quota — retries are free.
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import { enqueueAnalysis } from "../services/queue.service.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import * as analysisBatchRepo from "../repositories/analysis-batch.repository.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface RetryAnalysisBatchesInput {
  analysisId: string;
}

const RETRYABLE_STATUSES = ["partially_completed", "failed"];

export async function retryAnalysisBatches(
  input: RetryAnalysisBatchesInput,
  ctx: CommandContext,
): Promise<CommandResult<{ id: string; status: string }>> {
  const { analysisId } = input;

  // Verify ownership
  const analysis = await analysisRepo.findByIdAndUser(analysisId, ctx.userId);
  if (!analysis) {
    throw PlatformError.notFound("Analysis", analysisId);
  }

  // Validate retryable status
  if (!RETRYABLE_STATUSES.includes(analysis.status)) {
    throw new PlatformError({
      code: "VALIDATION_ERROR",
      statusCode: 409,
      message:
        `Analysis is in "${analysis.status}" state and cannot be retried. ` +
        `Only partially_completed or failed analyses can be retried.`,
    });
  }

  // Reset failed batch rows to pending
  await analysisBatchRepo.resetFailed(analysisId);

  // Reset analysis counters for the retry
  await analysisRepo.updateById(analysisId, {
    failed_batches: 0,
    completed_photos: 0,
    total_photos: 0,
    error: null,
  });

  const quality = TIER_LIMITS[ctx.user.tier].imageQuality as ImageQuality;
  const size: ImageSize = "auto";

  // Enqueue with retry flag
  await enqueueAnalysis(
    analysisId,
    analysis.property_id,
    ctx.userId,
    quality,
    size,
    true
  );

  return {
    data: { id: analysisId, status: "analyzing" },
    events: [],
    availableActions: [
      {
        label: "Stream Progress",
        command: "StreamAnalysis",
        params: { analysisId },
      },
    ],
  };
}
