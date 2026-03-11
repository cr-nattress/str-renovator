/**
 * @module edit-analysis-fields
 * @capability EditAnalysisFields command handler
 * @layer Orchestration
 *
 * Updates AI-generated analysis fields (property_assessment, style_direction)
 * in place. Verifies ownership before applying edits.
 *
 * @see packages/shared/src/manifests/commands.ts — EditAnalysisFields
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbAnalysis, AnalysisUpdatedEvent } from "@str-renovator/shared";
import * as analysisRepo from "../repositories/analysis.repository.js";
import * as editHistoryRepo from "../repositories/edit-history.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface EditAnalysisFieldsInput {
  analysisId: string;
  property_assessment?: string;
  style_direction?: string;
}

export async function editAnalysisFields(
  input: EditAnalysisFieldsInput,
  ctx: CommandContext,
): Promise<CommandResult<DbAnalysis>> {
  const { analysisId, ...fieldCandidates } = input;

  const analysis = await analysisRepo.findOwnershipCheck(analysisId, ctx.userId);
  if (!analysis) {
    throw PlatformError.notFound("Analysis", analysisId);
  }

  const fields: Record<string, string> = {};
  if (typeof fieldCandidates.property_assessment === "string") {
    fields.property_assessment = fieldCandidates.property_assessment;
  }
  if (typeof fieldCandidates.style_direction === "string") {
    fields.style_direction = fieldCandidates.style_direction;
  }

  if (Object.keys(fields).length === 0) {
    throw PlatformError.validationError("No valid fields to update");
  }

  // Snapshot current values for edit history
  const current = await analysisRepo.findByIdAndUser(analysisId, ctx.userId);

  const updated = await analysisRepo.updateFields(analysisId, fields);

  // Record edit history for each changed field
  for (const [key, newValue] of Object.entries(fields)) {
    const previousValue = current ? (current as unknown as Record<string, unknown>)[key] : null;
    await editHistoryRepo.create({
      entity_type: "Analysis",
      entity_id: analysisId,
      field_path: key,
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
      edited_by: ctx.userId,
      source: "user",
    }).catch(() => { /* edit history is additive — don't fail the update */ });
  }

  const events: AnalysisUpdatedEvent[] = [
    {
      type: "AnalysisUpdated",
      entityId: analysisId,
      entityType: "Analysis",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { analysisId, userId: ctx.userId, updatedFields: Object.keys(fields) },
    },
  ];
  await publishEvents(events);

  return {
    data: updated,
    events,
    availableActions: [
      {
        label: "View Analysis",
        command: "GetAnalysis",
        params: { analysisId },
      },
    ],
  };
}
