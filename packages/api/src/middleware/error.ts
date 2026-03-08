import type { Request, Response, NextFunction } from "express";
import { PlatformError } from "@str-renovator/shared";
import { logger } from "../config/logger.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof PlatformError) {
    const log = req.log ?? logger;
    log.warn({ code: err.code, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Unstructured error — log full stack, return generic 500
  const log = req.log ?? logger;
  log.error({ err }, "unhandled error");
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    statusCode: 500,
    recovery: [{ label: "Try again", action: "retry" }],
    retryable: true,
  });
}
