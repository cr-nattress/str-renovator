/**
 * @module ActionBar
 * @capability Renders platform-driven available actions as buttons
 * @layer Surface
 *
 * Consumes `AvailableAction[]` from API responses and renders them
 * using existing shadcn/ui Button. Handles confirmation dialogs for
 * destructive actions. The frontend never decides which actions to show --
 * the platform computes them based on entity state.
 */

import type { AvailableAction } from "@str-renovator/shared";
import { Button } from "@/components/ui/button";

interface ActionBarProps {
  actions: AvailableAction[];
  onAction: (action: AvailableAction) => void;
  layout?: "horizontal" | "vertical";
}

function mapVariant(
  variant: AvailableAction["variant"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (variant) {
    case "primary":
      return "default";
    case "destructive":
      return "destructive";
    case "secondary":
      return "secondary";
    default:
      return "outline";
  }
}

export function ActionBar({ actions, onAction, layout = "horizontal" }: ActionBarProps) {
  if (actions.length === 0) return null;

  const handleClick = (action: AvailableAction) => {
    if (action.confirmation) {
      if (!window.confirm(action.confirmation)) return;
    }
    onAction(action);
  };

  return (
    <div
      className={
        layout === "horizontal"
          ? "flex flex-wrap items-center gap-2"
          : "flex flex-col gap-2"
      }
    >
      {actions.map((action) => (
        <Button
          key={action.command}
          variant={mapVariant(action.variant)}
          size="sm"
          disabled={action.disabled}
          title={action.disabled ? action.disabledReason : undefined}
          onClick={() => handleClick(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
