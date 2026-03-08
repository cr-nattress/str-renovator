import type { PlatformErrorCode, RecoveryAction } from "@str-renovator/shared";

/**
 * @module ApiError
 * @layer Surface (web)
 *
 * Client-side representation of a PlatformError response from the API.
 * When the API returns a structured error with `code`, `recovery`, and
 * `retryable` fields, `apiFetch` wraps it in this class so components
 * can render recovery actions and retry buttons.
 */
export class ApiError extends Error {
  public readonly code: PlatformErrorCode;
  public readonly statusCode: number;
  public readonly recovery: RecoveryAction[];
  public readonly retryable: boolean;

  constructor(body: {
    code: PlatformErrorCode;
    message: string;
    statusCode: number;
    recovery: RecoveryAction[];
    retryable: boolean;
  }) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.statusCode = body.statusCode;
    this.recovery = body.recovery;
    this.retryable = body.retryable;
  }
}

/** Type guard to check if an unknown error is a structured ApiError */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Checks whether an API response body has the PlatformError shape */
export function isPlatformErrorBody(
  body: unknown
): body is {
  code: string;
  message: string;
  statusCode: number;
  recovery: RecoveryAction[];
  retryable: boolean;
} {
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    "message" in body &&
    "statusCode" in body
  );
}
