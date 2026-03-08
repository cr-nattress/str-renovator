import { useNavigate } from "react-router-dom";
import { isApiError } from "../api/api-error.js";
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
    <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700">{message}</p>

          {(recovery.length > 0 || (retryable && onRetry)) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {recovery.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleAction(action)}
                  className={
                    action.action === "retry"
                      ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      : "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  }
                >
                  {action.label}
                </button>
              ))}
              {retryable && onRetry && !recovery.some((a) => a.action === "retry") && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
