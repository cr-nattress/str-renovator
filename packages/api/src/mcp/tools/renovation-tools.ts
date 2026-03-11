/**
 * @module mcp/tools/renovation-tools
 * @capability MCP Server — Renovation management tools
 * @layer Execution
 *
 * Registers MCP tools for retrieving renovation results and submitting feedback.
 *
 * @see packages/api/src/repositories/renovation.repository.ts
 * @see packages/api/src/commands/submit-renovation-feedback.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as renovationRepo from "../../repositories/renovation.repository.js";
import { submitRenovationFeedback } from "../../commands/submit-renovation-feedback.js";
import { supabase } from "../../config/supabase.js";
import { getDbUser } from "../auth.js";

export function registerRenovationTools(server: McpServer): void {
  server.tool(
    "get_renovations",
    "Get all renovation iterations for an analysis photo, with signed image URLs.",
    {
      analysis_photo_id: z.string().uuid().describe("The analysis photo UUID"),
    },
    async ({ analysis_photo_id }) => {
      try {
        const user = await getDbUser();
        const renovations = await renovationRepo.listByAnalysisPhoto(analysis_photo_id, user.id);
        const withUrls = await Promise.all(
          renovations.map(async (reno) => {
            let signed_url: string | null = null;
            if (reno.storage_path) {
              const { data } = await supabase.storage
                .from("photos")
                .createSignedUrl(reno.storage_path, 3600);
              signed_url = data?.signedUrl ?? null;
            }
            return { ...reno, signed_url };
          }),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(withUrls, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "submit_feedback",
    "Submit a like/dislike rating with optional comment on a renovation image.",
    {
      renovation_id: z.string().uuid().describe("The renovation UUID"),
      rating: z.enum(["like", "dislike"]).describe("Rating for the renovation"),
      comment: z.string().optional().describe("Optional feedback comment"),
    },
    async ({ renovation_id, rating, comment }) => {
      try {
        const user = await getDbUser();
        const result = await submitRenovationFeedback(
          { renovationId: renovation_id, rating, comment },
          { userId: user.id, user },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { feedback: result.data, availableActions: result.availableActions },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}
