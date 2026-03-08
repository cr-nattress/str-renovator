import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import * as userRepo from "../repositories/user.repository.js";
import type { DbUser } from "@str-renovator/shared";

declare global {
  namespace Express {
    interface Request {
      dbUser?: DbUser;
    }
  }
}

export const clerkAuth = clerkMiddleware();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await userRepo.findByClerkId(userId);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
