import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { isApiError } from "../api/api-error.js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { RecoveryAction } from "@str-renovator/shared";

interface Props {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Renders a structured error alert. When the error is an ApiError
 * (parsed from a PlatformError response), it renders the server-provided
 * message and recovery action buttons. For generic errors it falls back
 * to a simple error message with an optional retry button.
 */
export function ErrorAlert({ error, onRetry, onDismiss }: Props) {
  const navigate = useNavigate();

  if (!error) return null;

  const message = isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : "Something unexpected happened. Please try again.";

  const recovery: RecoveryAction[] = isApiError(error) ? error.recovery : [];
  const retryable = isApiError(error) ? error.retryable : !!onRetry;

  function handleAction(action: RecoveryAction) {
    switch (action.action) {
      case "retry":
        onRetry?.();
        break;
      case "navigate":
        if (action.target) navigate(action.target);
        break;
      case "dismiss":
        onDismiss?.();
        break;
      case "contact_support":
        window.open("mailto:support@strenovator.com", "_blank");
        break;
    }
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="text-sm">{message}</p>

        {(recovery.length > 0 || (retryable && onRetry)) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recovery.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.action === "retry" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleAction(action)}
              >
                {action.label}
              </Button>
            ))}
            {retryable && onRetry && !recovery.some((a) => a.action === "retry") && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
