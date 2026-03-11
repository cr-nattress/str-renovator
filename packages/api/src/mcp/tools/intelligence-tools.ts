/**
 * @module mcp/tools/intelligence-tools
 * @capability MCP Server — Property intelligence tools
 * @layer Execution
 *
 * Registers MCP tools for retrieving property intelligence data:
 * property profiles, location profiles, review analyses, and action plans.
 *
 * @see packages/api/src/repositories/property.repository.ts
 * @see packages/api/src/repositories/design-journey.repository.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as propertyRepo from "../../repositories/property.repository.js";
import * as journeyRepo from "../../repositories/design-journey.repository.js";
import { getDbUser } from "../auth.js";

export function registerIntelligenceTools(server: McpServer): void {
  server.tool(
    "get_property_profile",
    "Get the synthesized property intelligence profile (capacity, pricing, target guests, competitive positioning).",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const data = await propertyRepo.findByIdWithColumns(
          property_id,
          user.id,
          "id, name, property_profile",
        );
        if (!data) {
          return {
            content: [{ type: "text" as const, text: `Property not found: ${property_id}` }],
            isError: true,
          };
        }
        if (!data.property_profile) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No property profile available yet. Run a listing scrape first.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
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
    "get_location_profile",
    "Get the AI-generated location intelligence profile (area type, demographics, seasonal patterns, attractions).",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const data = await propertyRepo.findByIdWithColumns(
          property_id,
          user.id,
          "id, name, location_profile",
        );
        if (!data) {
          return {
            content: [{ type: "text" as const, text: `Property not found: ${property_id}` }],
            isError: true,
          };
        }
        if (!data.location_profile) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No location profile available yet. Run location research first.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
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
    "get_review_analysis",
    "Get the AI-generated guest review analysis (sentiment, themes, strengths, concerns).",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const data = await propertyRepo.findByIdWithColumns(
          property_id,
          user.id,
          "id, name, review_analysis",
        );
        if (!data) {
          return {
            content: [{ type: "text" as const, text: `Property not found: ${property_id}` }],
            isError: true,
          };
        }
        if (!data.review_analysis) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No review analysis available yet. Run a listing scrape on a URL with reviews.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
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
    "get_action_plan",
    "Get the design renovation journey (action plan) items for a property.",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const items = await journeyRepo.listByProperty(property_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
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
