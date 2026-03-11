/**
 * @module submit-analysis
 * @capability SubmitAnalysis command handler
 * @layer Orchestration
 *
 * Submits a property for AI photo analysis. Validates ownership, monthly
 * tier limit, and photo availability, then creates an analysis row,
 * enqueues the BullMQ job, and increments the user's monthly counter.
 *
 * @see packages/shared/src/manifests/commands.ts — SubmitAnalysis
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { ImageQuality, ImageSize, AnalysisSubmittedEvent } from "@str-renovator/shared";
import { enqueueAnalysis } from "../services/queue.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface SubmitAnalysisInput {
  propertyId: string;
  quality?: ImageQuality;
  size?: ImageSize;
}

export async function submitAnalysis(
  input: SubmitAnalysisInput,
  ctx: CommandContext,
): Promise<CommandResult<{ id: string; status: string }>> {
  const { propertyId } = input;

  // Verify property ownership
  const property = await propertyRepo.findByIdWithColumns(propertyId, ctx.userId, "id");
  if (!property) {
    throw PlatformError.notFound("Property", propertyId);
  }

  // Check monthly limit
  const limit = ctx.tierLimit ?? TIER_LIMITS[ctx.user.tier].analysesPerMonth;
  if (ctx.user.analyses_this_month >= limit) {
    throw PlatformError.tierLimitReached("analyses per month", limit);
  }

  // Count photos
  const photoCount = await photoRepo.countByProperty(propertyId);
  if (!photoCount || photoCount === 0) {
    throw PlatformError.validationError("No photos uploaded for this property");
  }

  const quality = input.quality ?? TIER_LIMITS[ctx.user.tier].imageQuality;
  const size = input.size ?? "auto";

  // Create analysis row
  const analysis = await analysisRepo.create({
    property_id: propertyId,
    user_id: ctx.userId,
    status: "pending",
    total_photos: photoCount,
  });

  // Enqueue job
  await enqueueAnalysis(analysis.id, propertyId, ctx.userId, quality, size);

  // Counter increment moved to counter-manager event handler
  const events: AnalysisSubmittedEvent[] = [
    {
      type: "AnalysisSubmitted",
      entityId: analysis.id,
      entityType: "Analysis",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { analysisId: analysis.id, propertyId, userId: ctx.userId, photoCount },
    },
  ];
  await publishEvents(events);

  return {
    data: { id: analysis.id, status: analysis.status },
    events,
    availableActions: [
      {
        label: "Stream Progress",
        command: "StreamAnalysis",
        params: { analysisId: analysis.id },
      },
      {
        label: "View Analysis",
        command: "GetAnalysis",
        params: { analysisId: analysis.id },
      },
    ],
  };
}
