/**
 * @module ActionChips
 * @capability Renders platform-driven follow-up actions as compact chips
 * @layer Surface
 *
 * A lighter-weight variant of ActionBar for contextual suggestions.
 * Renders actions as smaller badge-style buttons.
 */

import type { AvailableAction } from "@str-renovator/shared";
import { Button } from "@/components/ui/button";

interface ActionChipsProps {
  actions: AvailableAction[];
  onAction: (action: AvailableAction) => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ActionChips({
  actions,
  onAction,
  dismissible,
  onDismiss,
}: ActionChipsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <Button
          key={action.command}
          variant="outline"
          size="sm"
          className="h-7 text-xs rounded-full px-3"
          disabled={action.disabled}
          title={action.disabled ? action.disabledReason : undefined}
          onClick={() => onAction(action)}
        >
          {action.label}
        </Button>
      ))}
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 text-muted-foreground"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      )}
    </div>
  );
}
