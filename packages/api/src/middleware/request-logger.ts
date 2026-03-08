import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../config/logger.js";

declare global {
  namespace Express {
    interface Request {
      log: typeof logger;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const traceId = randomUUID();
  const start = Date.now();

  req.log = logger.child({
    traceId,
    method: req.method,
    path: req.path,
  });

  res.on("finish", () => {
    req.log.info({ statusCode: res.statusCode, durationMs: Date.now() - start }, "request completed");
  });

  next();
}
