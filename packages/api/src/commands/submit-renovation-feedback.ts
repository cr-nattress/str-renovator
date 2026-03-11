/**
 * @module submit-renovation-feedback
 * @capability SubmitRenovationFeedback command handler
 * @layer Orchestration
 *
 * Creates a like/dislike feedback entry on a renovation image
 * after verifying the caller owns the renovation.
 *
 * @see packages/shared/src/manifests/commands.ts — SubmitRenovationFeedback
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbFeedback, FeedbackRating, FeedbackSubmittedEvent } from "@str-renovator/shared";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as feedbackRepo from "../repositories/feedback.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface SubmitRenovationFeedbackInput {
  renovationId: string;
  rating: FeedbackRating;
  comment?: string;
}

export async function submitRenovationFeedback(
  input: SubmitRenovationFeedbackInput,
  ctx: CommandContext,
): Promise<CommandResult<DbFeedback>> {
  const { renovationId, rating, comment } = input;

  const renovation = await renovationRepo.findOwnershipCheck(renovationId, ctx.userId);
  if (!renovation) {
    throw PlatformError.notFound("Renovation", renovationId);
  }

  const data = await feedbackRepo.create({
    renovation_id: renovationId,
    user_id: ctx.userId,
    rating,
    comment: comment ?? null,
  });

  const events: FeedbackSubmittedEvent[] = [
    {
      type: "FeedbackSubmitted",
      entityId: data.id,
      entityType: "Feedback",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { feedbackId: data.id, renovationId, userId: ctx.userId, rating },
    },
  ];
  await publishEvents(events);

  return {
    data,
    events,
    availableActions: [
      {
        label: "Rerun Renovation",
        command: "RerunRenovation",
        params: { renovationId },
      },
    ],
  };
}
