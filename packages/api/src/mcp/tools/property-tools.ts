/**
 * @module mcp/tools/property-tools
 * @capability MCP Server — Property management tools
 * @layer Execution
 *
 * Registers MCP tools for listing, retrieving, and creating STR properties.
 *
 * @see packages/api/src/repositories/property.repository.ts
 * @see packages/api/src/commands/create-property.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as propertyRepo from "../../repositories/property.repository.js";
import { createProperty } from "../../commands/create-property.js";
import { scrapePropertyListing } from "../../commands/scrape-property-listing.js";
import { researchPropertyLocation } from "../../commands/research-property-location.js";
import { getDbUser } from "../auth.js";

export function registerPropertyTools(server: McpServer): void {
  server.tool(
    "list_properties",
    "List all STR properties for the authenticated user.",
    {},
    async () => {
      try {
        const user = await getDbUser();
        const properties = await propertyRepo.listByUser(user.id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(properties, null, 2),
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
    "get_property",
    "Get a property by ID with scraped data, location profile, review analysis, and property profile.",
    { property_id: z.string().uuid().describe("The property UUID") },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const property = await propertyRepo.findByIdAndUser(property_id, user.id);
        if (!property) {
          return {
            content: [{ type: "text" as const, text: `Property not found: ${property_id}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(property, null, 2) }],
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
    "create_property",
    "Create a new STR property for the authenticated user.",
    {
      name: z.string().describe("Property name"),
      description: z.string().optional().describe("Property description"),
      listing_url: z.string().url().optional().describe("Listing URL (e.g. Airbnb, VRBO)"),
      context: z.string().optional().describe("Additional context about the property"),
      address_line1: z.string().optional().describe("Street address line 1"),
      city: z.string().optional().describe("City"),
      state: z.string().optional().describe("State/province"),
      zip_code: z.string().optional().describe("Postal/zip code"),
      country: z.string().optional().describe("Country"),
    },
    async (input) => {
      try {
        const user = await getDbUser();
        const result = await createProperty(input, { userId: user.id, user });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { property: result.data, availableActions: result.availableActions },
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
    "scrape_property_listing",
    "Start a background scrape of a property's listing URL to extract structured data, photos, and reviews.",
    {
      property_id: z.string().uuid().describe("The property UUID"),
      listing_url: z.string().url().describe("The listing URL to scrape"),
    },
    async ({ property_id, listing_url }) => {
      try {
        const user = await getDbUser();
        const result = await scrapePropertyListing(
          { propertyId: property_id, listing_url },
          { userId: user.id, user },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { scrape_job_id: result.data.scrape_job_id, status: "queued" },
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
    "research_property_location",
    "Start background AI research on a property's location. Requires city or state on the property record.",
    {
      property_id: z.string().uuid().describe("The property UUID"),
    },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const result = await researchPropertyLocation(
          { propertyId: property_id },
          { userId: user.id, user },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ status: result.data.status }, null, 2),
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
