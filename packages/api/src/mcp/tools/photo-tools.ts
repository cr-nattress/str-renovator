/**
 * @module mcp/tools/photo-tools
 * @capability MCP Server — Photo management tools
 * @layer Execution
 *
 * Registers MCP tools for listing photos and getting photo counts.
 *
 * @see packages/api/src/repositories/photo.repository.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as photoRepo from "../../repositories/photo.repository.js";
import { supabase } from "../../config/supabase.js";

export function registerPhotoTools(server: McpServer): void {
  server.tool(
    "list_photos",
    "List all photos for a property with signed URLs for viewing.",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const photos = await photoRepo.listByProperty(property_id);
        const photosWithUrls = await Promise.all(
          photos.map(async (photo) => {
            const { data } = await supabase.storage
              .from("photos")
              .createSignedUrl(photo.storage_path, 3600);
            return { ...photo, signed_url: data?.signedUrl ?? null };
          }),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(photosWithUrls, null, 2) }],
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
    "get_photo_count",
    "Get the number of photos uploaded for a property.",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const count = await photoRepo.countByProperty(property_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ count }, null, 2) }],
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
