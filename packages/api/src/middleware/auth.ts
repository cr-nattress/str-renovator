import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";
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

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", userId)
      .single();

    if (error || !user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.dbUser = user as DbUser;
    next();
  } catch (err) {
    next(err);
  }
}
