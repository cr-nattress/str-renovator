/**
 * @module mcp/auth
 * @capability MCP Server — Authentication helpers
 * @layer Execution
 *
 * Resolves the authenticated user for MCP tool invocations.
 * Identity comes from the CLERK_USER_ID environment variable, which
 * the MCP host (e.g. Claude Desktop) sets before launching the process.
 *
 * @see packages/api/src/repositories/user.repository.ts — user lookup
 */

import type { DbUser } from "@str-renovator/shared";
import * as userRepo from "../repositories/user.repository.js";

/** Returns the Clerk user ID from the environment. Throws if missing. */
export function getClerkUserId(): string {
  const clerkId = process.env.CLERK_USER_ID;
  if (!clerkId) {
    throw new Error("CLERK_USER_ID environment variable is required for MCP server");
  }
  return clerkId;
}

let cachedUser: DbUser | null = null;

/**
 * Resolves the DbUser for the configured Clerk user ID.
 * Result is cached for the lifetime of the process to avoid
 * repeated lookups on every tool call.
 */
export async function getDbUser(): Promise<DbUser> {
  if (cachedUser) return cachedUser;

  const clerkId = getClerkUserId();
  const user = await userRepo.findByClerkId(clerkId);
  if (!user) {
    throw new Error(`No database user found for Clerk ID: ${clerkId}`);
  }

  cachedUser = user;
  return user;
}
