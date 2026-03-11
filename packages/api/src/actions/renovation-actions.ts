/**
 * @module renovation-actions
 * @capability Pure function that computes available actions for a renovation view
 * @layer Orchestration
 *
 * Examines renovation iteration count and feedback state to determine
 * available actions like re-run and rate.
 */

import type { AvailableAction } from "@str-renovator/shared";

interface RenovationActionContext {
  latestRenovationId: string | null;
  iterationCount: number;
  rerunLimit: number;
  hasLatestFeedback: boolean;
}

export function computeRenovationActions(
  context: RenovationActionContext,
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (!context.latestRenovationId) return actions;

  if (!context.hasLatestFeedback) {
    actions.push({
      label: "Rate This Result",
      command: "submit-feedback",
      params: { renovationId: context.latestRenovationId },
      variant: "secondary",
      icon: "ThumbsUp",
    });
  }

  if (context.iterationCount < context.rerunLimit) {
    actions.push({
      label: "Re-run Renovation",
      command: "rerun-renovation",
      params: { renovationId: context.latestRenovationId },
      variant: "primary",
      icon: "RotateCcw",
    });
  } else {
    actions.push({
      label: "Re-run Renovation",
      command: "rerun-renovation",
      params: { renovationId: context.latestRenovationId },
      variant: "primary",
      icon: "RotateCcw",
      disabled: true,
      disabledReason: `Re-run limit reached (${context.rerunLimit} per photo)`,
    });
  }

  return actions;
}
