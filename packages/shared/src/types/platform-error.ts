/**
 * @module PlatformError
 * @capability Error handling
 * @layer Shared contract
 *
 * Structured error type for the STR Renovator platform.
 * All API errors should be instances of PlatformError with a specific error code,
 * HTTP status, and optional recovery actions for the frontend to render.
 */

export interface RecoveryAction {
  label: string;
  action: "retry" | "navigate" | "contact_support" | "dismiss";
  target?: string;
}

export type PlatformErrorCode =
  | "PROPERTY_NOT_FOUND"
  | "ANALYSIS_NOT_FOUND"
  | "PHOTO_NOT_FOUND"
  | "RENOVATION_NOT_FOUND"
  | "JOURNEY_ITEM_NOT_FOUND"
  | "SCRAPE_JOB_NOT_FOUND"
  | "TIER_LIMIT_REACHED"
  | "AI_SERVICE_ERROR"
  | "PHOTO_UPLOAD_FAILED"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMIT_EXCEEDED"
  | "SCRAPE_FAILED"
  | "INTERNAL_ERROR";

export class PlatformError extends Error {
  public readonly code: PlatformErrorCode;
  public readonly statusCode: number;
  public readonly recovery: RecoveryAction[];
  public readonly retryable: boolean;

  constructor(options: {
    code: PlatformErrorCode;
    message: string;
    statusCode?: number;
    recovery?: RecoveryAction[];
    retryable?: boolean;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "PlatformError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? PlatformError.defaultStatusCode(options.code);
    this.recovery = options.recovery ?? PlatformError.defaultRecovery(options.code);
    this.retryable = options.retryable ?? PlatformError.defaultRetryable(options.code);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      recovery: this.recovery,
      retryable: this.retryable,
    };
  }

  private static defaultStatusCode(code: PlatformErrorCode): number {
    const map: Record<PlatformErrorCode, number> = {
      PROPERTY_NOT_FOUND: 404,
      ANALYSIS_NOT_FOUND: 404,
      PHOTO_NOT_FOUND: 404,
      RENOVATION_NOT_FOUND: 404,
      JOURNEY_ITEM_NOT_FOUND: 404,
      SCRAPE_JOB_NOT_FOUND: 404,
      TIER_LIMIT_REACHED: 403,
      AI_SERVICE_ERROR: 502,
      PHOTO_UPLOAD_FAILED: 500,
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      RATE_LIMIT_EXCEEDED: 429,
      SCRAPE_FAILED: 502,
      INTERNAL_ERROR: 500,
    };
    return map[code];
  }

  private static defaultRecovery(code: PlatformErrorCode): RecoveryAction[] {
    const map: Partial<Record<PlatformErrorCode, RecoveryAction[]>> = {
      TIER_LIMIT_REACHED: [
        { label: "Upgrade plan", action: "navigate", target: "/pricing" },
      ],
      AI_SERVICE_ERROR: [
        { label: "Try again", action: "retry" },
      ],
      PHOTO_UPLOAD_FAILED: [
        { label: "Try again", action: "retry" },
      ],
      RATE_LIMIT_EXCEEDED: [
        { label: "Try again in a moment", action: "retry" },
      ],
      SCRAPE_FAILED: [
        { label: "Try again", action: "retry" },
      ],
      UNAUTHORIZED: [
        { label: "Sign in", action: "navigate", target: "/sign-in" },
      ],
    };
    return map[code] ?? [{ label: "Dismiss", action: "dismiss" }];
  }

  private static defaultRetryable(code: PlatformErrorCode): boolean {
    return ["AI_SERVICE_ERROR", "PHOTO_UPLOAD_FAILED", "RATE_LIMIT_EXCEEDED", "SCRAPE_FAILED"].includes(code);
  }

  /** Factory helpers for common errors */

  static notFound(entity: string, id?: string): PlatformError {
    const code = `${entity.toUpperCase()}_NOT_FOUND` as PlatformErrorCode;
    const message = id ? `${entity} not found: ${id}` : `${entity} not found`;
    return new PlatformError({ code, message });
  }

  static tierLimitReached(resource: string, limit: number): PlatformError {
    return new PlatformError({
      code: "TIER_LIMIT_REACHED",
      message: `You've reached your plan limit of ${limit} ${resource}. Upgrade for more.`,
    });
  }

  static validationError(message: string): PlatformError {
    return new PlatformError({ code: "VALIDATION_ERROR", message });
  }

  static aiServiceError(message: string, cause?: Error): PlatformError {
    return new PlatformError({
      code: "AI_SERVICE_ERROR",
      message: `AI service error: ${message}`,
      cause,
    });
  }
}
