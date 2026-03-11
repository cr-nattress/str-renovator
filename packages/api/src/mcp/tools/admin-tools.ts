/**
 * @module mcp/tools/admin-tools
 * @capability MCP Server — Admin and monitoring tools
 * @layer Execution
 *
 * Registers MCP tools for checking job status and listing scrape jobs.
 *
 * @see packages/api/src/repositories/scrape-job.repository.ts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as scrapeJobRepo from "../../repositories/scrape-job.repository.js";
import { getDbUser } from "../auth.js";

export function registerAdminTools(server: McpServer): void {
  server.tool(
    "get_scrape_job_status",
    "Get the current status and progress of a scrape job.",
    { scrape_job_id: z.string().uuid().describe("The scrape job UUID") },
    async ({ scrape_job_id }) => {
      try {
        const streamData = await scrapeJobRepo.getStreamData(scrape_job_id);
        if (!streamData) {
          return {
            content: [{ type: "text" as const, text: `Scrape job not found: ${scrape_job_id}` }],
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
    "list_scrape_jobs",
    "List recent scrape jobs for a property.",
    {
      property_id: z.string().uuid().describe("The property UUID"),
    },
    async ({ property_id }) => {
      try {
        const user = await getDbUser();
        const jobs = await scrapeJobRepo.listByProperty(property_id, user.id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(jobs, null, 2) }],
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
