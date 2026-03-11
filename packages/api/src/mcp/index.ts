/**
 * @module mcp
 * @capability MCP Server — Stdio entry point
 * @layer Execution
 *
 * Entry point for the MCP server process. Loads environment variables,
 * creates the server, and connects it to a stdio transport.
 *
 * Launch: `npx tsx packages/api/src/mcp/index.ts`
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_USER_ID,
 * OPENAI_API_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
 */

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
