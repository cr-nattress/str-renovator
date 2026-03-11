import type { Request, Response, NextFunction } from "express";
import { TIER_LIMITS, type TierLimits } from "@str-renovator/shared";
import { env } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      tierLimit?: number;
    }
  }
}

export function checkTierLimit(limitKey: keyof TierLimits) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.dbUser;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Debug mode bypasses all tier limits
      if (env.debugMode) {
        req.tierLimit = Infinity;
        next();
        return;
      }

      const limits = TIER_LIMITS[user.tier];
      const limitValue = limits[limitKey];

      if (typeof limitValue === "boolean") {
        if (!limitValue) {
          res.status(403).json({
            error: `Feature "${limitKey}" is not available on your ${user.tier} plan`,
          });
          return;
        }
        next();
        return;
      }

      // For numeric limits, route handlers check the actual count themselves.
      // We attach the limit to the request for handlers to use.
      if (typeof limitValue === "number") {
        req.tierLimit = limitValue;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
