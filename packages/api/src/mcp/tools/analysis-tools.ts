/**
 * @module mcp/tools/analysis-tools
 * @capability MCP Server — Analysis management tools
 * @layer Execution
 *
 * Registers MCP tools for submitting, retrieving, and listing photo analyses.
 *
 * @see packages/api/src/repositories/analysis.repository.ts
 * @see packages/api/src/commands/submit-analysis.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import { submitAnalysis } from "../../commands/submit-analysis.js";
import { getDbUser } from "../auth.js";

export function registerAnalysisTools(server: McpServer): void {
  server.tool(
    "start_analysis",
    "Submit a property for AI photo analysis. Enqueues a background job and returns immediately.",
    {
      property_id: z.string().uuid().describe("The property UUID to analyze"),
      quality: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Image quality for analysis (defaults to tier setting)"),
      size: z
        .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
        .optional()
        .describe("Image size for renovations (defaults to auto)"),
    },
    async ({ property_id, quality, size }) => {
      try {
        const user = await getDbUser();
        const result = await submitAnalysis(
          { propertyId: property_id, quality, size },
          { userId: user.id, user },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { analysis: result.data, availableActions: result.availableActions },
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

  server.tool(
    "get_analysis",
    "Get an analysis by ID with all photo analysis data.",
    { analysis_id: z.string().uuid().describe("The analysis UUID") },
    async ({ analysis_id }) => {
      try {
        const user = await getDbUser();
        const analysis = await analysisRepo.findByIdWithPhotos(analysis_id, user.id);
        if (!analysis) {
          return {
            content: [{ type: "text" as const, text: `Analysis not found: ${analysis_id}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(analysis, null, 2) }],
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
    "get_analysis_status",
    "Get the current status and progress of an analysis.",
    { analysis_id: z.string().uuid().describe("The analysis UUID") },
    async ({ analysis_id }) => {
      try {
        const streamData = await analysisRepo.getStreamData(analysis_id);
        if (!streamData) {
          return {
            content: [{ type: "text" as const, text: `Analysis not found: ${analysis_id}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(streamData, null, 2) }],
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
    "list_analyses",
    "List all analyses for a property.",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const analyses = await analysisRepo.listByPropertyAndUser(property_id, user.id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(analyses, null, 2) }],
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
