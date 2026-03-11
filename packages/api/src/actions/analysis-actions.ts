/**
 * @module analysis-actions
 * @capability Pure function that computes available actions for an analysis
 * @layer Orchestration
 *
 * Examines analysis status to determine which actions are available.
 * Terminal states (completed/failed) offer different action sets.
 */

import type { DbAnalysis, AvailableAction } from "@str-renovator/shared";

export function computeAnalysisActions(analysis: DbAnalysis): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (analysis.status === "completed" || analysis.status === "partially_completed") {
    actions.push({
      label: "View Action Plan",
      command: "view-action-plan",
      params: { analysisId: analysis.id, propertyId: analysis.property_id },
      variant: "primary",
      icon: "Compass",
    });

    actions.push({
      label: "Edit Assessment",
      command: "edit-assessment",
      params: { analysisId: analysis.id },
      variant: "secondary",
      icon: "Pencil",
    });

    actions.push({
      label: "Archive",
      command: "archive-analysis",
      params: { analysisId: analysis.id },
      variant: "destructive",
      icon: "X",
      confirmation: "Remove this analysis from the list? The data will be preserved.",
    });
  }

  if (analysis.status === "failed") {
    actions.push({
      label: "Retry Analysis",
      command: "retry-analysis",
      params: { analysisId: analysis.id, propertyId: analysis.property_id },
      variant: "primary",
      icon: "RotateCcw",
    });
  }

  return actions;
}
