/**
 * @module undo-edit
 * @capability UndoEdit command handler
 * @layer Orchestration
 *
 * Reverts a previous field edit by applying the stored previous_value
 * back to the entity and recording the undo as a new edit history entry.
 */

import { PlatformError } from "@str-renovator/shared";
import type { DbEditHistory } from "@str-renovator/shared";
import * as editHistoryRepo from "../repositories/edit-history.repository.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface UndoEditInput {
  editHistoryId: string;
}

export async function undoEdit(
  input: UndoEditInput,
  ctx: CommandContext,
): Promise<CommandResult<DbEditHistory>> {
  const entry = await editHistoryRepo.findById(input.editHistoryId);
  if (!entry) {
    throw PlatformError.notFound("Edit history entry", input.editHistoryId);
  }

  if (entry.edited_by !== ctx.userId) {
    throw new PlatformError({
      code: "FORBIDDEN",
      message: "You can only undo your own edits",
    });
  }

  // Apply previous_value back to the entity
  await applyRevert(entry);

  // Record the undo as a new edit history entry
  const undoEntry = await editHistoryRepo.create({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    field_path: entry.field_path,
    previous_value: entry.new_value,
    new_value: entry.previous_value,
    edited_by: ctx.userId,
    source: "user",
  });

  return {
    data: undoEntry,
    events: [],
    availableActions: [],
  };
}

async function applyRevert(entry: DbEditHistory): Promise<void> {
  const { entity_type, entity_id, field_path, previous_value } = entry;

  switch (entity_type) {
    case "Property": {
      // field_path is dot-notation like "property_profile.property_summary"
      const parts = field_path.split(".");
      if (parts.length === 1) {
        await propertyRepo.updateById(entity_id, { [field_path]: previous_value });
      } else {
        // For nested JSONB: read current value, merge, write back
        const property = await propertyRepo.findById(entity_id);
        if (!property) return;
        const topKey = parts[0] as keyof typeof property;
        const current = (property[topKey] as Record<string, unknown>) ?? {};
        const nested = { ...current, [parts.slice(1).join(".")]: previous_value };
        await propertyRepo.updateById(entity_id, { [parts[0]]: nested });
      }
      break;
    }
    case "Analysis": {
      await analysisRepo.updateById(entity_id, { [field_path]: previous_value });
      break;
    }
    case "JourneyItem": {
      // Use updateById pattern — journey repo update requires userId,
      // but for undo we use a direct update by id
      await journeyRepo.updateById(entity_id, { [field_path]: previous_value });
      break;
    }
  }
}
