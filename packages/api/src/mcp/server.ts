/**
 * @module mcp/server
 * @capability MCP Server — Main server setup and tool registration
 * @layer Execution
 *
 * Creates and configures the MCP server with all tool registrations.
 * Runs as a separate process from the Express API server, communicating
 * over stdio transport. AI agents (e.g. Claude Desktop) launch this
 * process and interact with it via the MCP protocol.
 *
 * Does NOT import or depend on the Express server.
 *
 * @see packages/shared/src/manifests/commands.ts — command registry
 * @see packages/shared/src/manifests/skills.ts — skill registry
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPropertyTools } from "./tools/property-tools.js";
import { registerAnalysisTools } from "./tools/analysis-tools.js";
import { registerPhotoTools } from "./tools/photo-tools.js";
import { registerRenovationTools } from "./tools/renovation-tools.js";
import { registerIntelligenceTools } from "./tools/intelligence-tools.js";
import { registerAdminTools } from "./tools/admin-tools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "str-renovator",
    version: "1.0.0",
  });

  registerPropertyTools(server);
  registerAnalysisTools(server);
  registerPhotoTools(server);
  registerRenovationTools(server);
  registerIntelligenceTools(server);
  registerAdminTools(server);

  return server;
}
