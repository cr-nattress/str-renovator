/**
 * @module rerun-renovation
 * @capability RerunRenovation command handler
 * @layer Orchestration
 *
 * Re-runs a renovation with accumulated feedback context. Checks the
 * per-photo rerun tier limit, aggregates all feedback for the analysis
 * photo, creates a new iteration, and enqueues a BullMQ job.
 *
 * @see packages/shared/src/manifests/commands.ts — RerunRenovation
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { ImageQuality, ImageSize, RenovationSubmittedEvent } from "@str-renovator/shared";
import { enqueueRenovation } from "../services/queue.service.js";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as feedbackRepo from "../repositories/feedback.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface RerunRenovationInput {
  renovationId: string;
  quality?: ImageQuality;
  size?: ImageSize;
}

export async function rerunRenovation(
  input: RerunRenovationInput,
  ctx: CommandContext,
): Promise<CommandResult<{ id: string; status: string }>> {
  const { renovationId } = input;

  // Get the original renovation
  const renovation = await renovationRepo.findByIdAndUser(renovationId, ctx.userId);
  if (!renovation) {
    throw PlatformError.notFound("Renovation", renovationId);
  }

  // Check rerun limit
  const count = await renovationRepo.countByAnalysisPhoto(renovation.analysis_photo_id);
  const limit = ctx.tierLimit ?? TIER_LIMITS[ctx.user.tier].rerunsPerPhoto;
  if (count >= limit + 1) {
    // +1 for original
    throw PlatformError.tierLimitReached("reruns per photo", limit);
  }

  // Collect all feedback for renovations of this analysis_photo
  const renovationIds = await renovationRepo.listIdsByAnalysisPhoto(renovation.analysis_photo_id);
  const allFeedback = await feedbackRepo.listByRenovationIds(renovationIds);

  // Build feedback context
  const feedbackContext = allFeedback
    .map(
      (f: any) =>
        `[${f.rating}]${f.comment ? ` ${f.comment}` : ""}`,
    )
    .join("\n");

  // Create new renovation
  const newRenovation = await renovationRepo.create({
    analysis_photo_id: renovation.analysis_photo_id,
    user_id: ctx.userId,
    iteration: renovation.iteration + 1,
    parent_renovation_id: renovation.id,
    feedback_context: feedbackContext || null,
    status: "pending",
  });

  const quality = input.quality ?? TIER_LIMITS[ctx.user.tier].imageQuality;
  const size = input.size ?? "auto";

  await enqueueRenovation(
    newRenovation.id,
    renovation.analysis_photo_id,
    ctx.userId,
    quality,
    size,
  );

  const events: RenovationSubmittedEvent[] = [
    {
      type: "RenovationSubmitted",
      entityId: newRenovation.id,
      entityType: "Renovation",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: {
        renovationId: newRenovation.id,
        analysisPhotoId: renovation.analysis_photo_id,
        userId: ctx.userId,
        iteration: newRenovation.iteration,
      },
    },
  ];
  await publishEvents(events);

  return {
    data: { id: newRenovation.id, status: newRenovation.status },
    events,
    availableActions: [
      {
        label: "View Renovation",
        command: "GetRenovation",
        params: { renovationId: newRenovation.id },
      },
    ],
  };
}
