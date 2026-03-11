/**
 * @module archive-analysis
 * @capability ArchiveAnalysis command handler
 * @layer Orchestration
 *
 * Soft-deletes (archives) a completed analysis after verifying ownership.
 *
 * @see packages/shared/src/manifests/commands.ts — ArchiveAnalysis
 */

import { PlatformError } from "@str-renovator/shared";
import type { AnalysisArchivedEvent } from "@str-renovator/shared";
import * as analysisRepo from "../repositories/analysis.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export async function archiveAnalysis(
  input: { analysisId: string },
  ctx: CommandContext,
): Promise<CommandResult<null>> {
  const analysis = await analysisRepo.findOwnershipCheck(input.analysisId, ctx.userId);
  if (!analysis) {
    throw PlatformError.notFound("Analysis", input.analysisId);
  }

  await analysisRepo.archive(input.analysisId);

  const events: AnalysisArchivedEvent[] = [
    {
      type: "AnalysisArchived",
      entityId: input.analysisId,
      entityType: "Analysis",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { analysisId: input.analysisId, userId: ctx.userId },
    },
  ];
  await publishEvents(events);

  return {
    data: null,
    events,
    availableActions: [
      {
        label: "View Analyses",
        command: "ListAnalyses",
      },
    ],
  };
}
