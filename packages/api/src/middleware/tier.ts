import type { Request, Response, NextFunction } from "express";
import { TIER_LIMITS, type TierLimits } from "@str-renovator/shared";

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
      (req as any).tierLimit = limitValue;
      next();
    } catch (err) {
      next(err);
    }
  };
}
