# Epic 10: MCP Server Surface

## Summary

Expose platform capabilities as an MCP (Model Context Protocol) server so AI agents (Claude Code, chatbots, automation pipelines) can interact with properties, trigger analyses, query results, and manage the renovation workflow programmatically.

## Why

The CLAUDE.md architecture defines MCP as a first-class capability surface: "Platform capabilities as tools for AI agents (Claude Code, chatbots, pipelines)."

An MCP server turns the STR Renovator into a tool that AI agents can use — enabling workflows like:
- "Analyze my Airbnb listing and tell me the top 3 renovations under $5k"
- "Compare renovation recommendations across my 3 properties"
- "What do guests complain about most at my cabin?"

## Current State

- No MCP server exists in the codebase
- No MCP-related files or configuration
- The platform already has a clean REST API that the MCP server can delegate to
- All business logic is accessible via repositories + services
- After Epic 02 (commands), MCP tools can simply invoke commands

## Scope

### 1. Create MCP Server Package

**Option A:** Add MCP server as a separate entry point in `packages/api/`
**Option B:** Create `packages/mcp/` as a new package

Recommend **Option A** — the MCP server needs access to the same repositories, services, and commands. A separate entry point avoids duplicating the dependency graph.

**File:** `packages/api/src/mcp/server.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "str-renovator",
  version: "1.0.0",
});

// Register tools
registerPropertyTools(server);
registerAnalysisTools(server);
registerPhotoTools(server);
registerRenovationTools(server);

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. Define MCP Tools

#### Property Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `list_properties` | List all properties for current user | `userId: string` |
| `get_property` | Get property details including scraped data, location profile, review analysis | `propertyId: string` |
| `create_property` | Create a new property | `name, description?, listingUrl?, city?, state?` |
| `create_property_from_url` | Create property and start scraping | `listingUrl: string` |

#### Analysis Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `start_analysis` | Submit property for AI analysis | `propertyId: string, quality?: string` |
| `get_analysis` | Get analysis results with photo assessments | `analysisId: string` |
| `get_analysis_status` | Check analysis job status | `analysisId: string` |
| `list_analyses` | List analyses for a property | `propertyId: string` |

#### Photo Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `list_photos` | List photos for a property with signed URLs | `propertyId: string` |
| `get_photo_count` | Get photo count for a property | `propertyId: string` |

#### Renovation Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `get_renovations` | Get renovation results for an analysis photo | `analysisPhotoId: string` |
| `submit_feedback` | Submit like/dislike feedback on a renovation | `renovationId, rating, comment?` |

#### Intelligence Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `get_property_profile` | Get synthesized property intelligence | `propertyId: string` |
| `get_location_profile` | Get location market research | `propertyId: string` |
| `get_review_analysis` | Get guest review analysis | `propertyId: string` |
| `get_action_plan` | Get renovation action plan from latest analysis | `propertyId: string` |

#### Admin Tools

| Tool | Description | Parameters |
|------|------------|-----------|
| `get_job_status` | Check status of any background job | `jobType, jobId` |
| `list_dlq_jobs` | List dead-letter queue entries | `queueName` |

### 3. MCP Resources

Expose key data as MCP resources:

| Resource | URI Pattern | Description |
|----------|------------|-------------|
| Property list | `str://properties` | All user properties |
| Property detail | `str://properties/{id}` | Single property with all profiles |
| Analysis results | `str://analyses/{id}` | Analysis with photo assessments |
| Action plan | `str://properties/{id}/action-plan` | Renovation action plan |

### 4. Authentication

MCP runs as a local process — authentication options:
- **Option A:** Require `CLERK_USER_ID` env var to identify the user
- **Option B:** Use API key-based auth
- **Option C:** Inherit from Claude Code's auth context

Start with Option A — simplest for local dev.

### 5. Entry Point Script

**File:** `packages/api/src/mcp/index.ts`

```typescript
#!/usr/bin/env node
import "./server.js";
```

**Package.json addition:**
```json
{
  "bin": {
    "str-renovator-mcp": "./dist/mcp/index.js"
  }
}
```

### 6. Claude Code Configuration

Users add to their `.claude/` settings:

```json
{
  "mcpServers": {
    "str-renovator": {
      "command": "npx",
      "args": ["tsx", "packages/api/src/mcp/index.ts"],
      "env": {
        "CLERK_USER_ID": "user_xxx"
      }
    }
  }
}
```

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/api/src/mcp/server.ts` | ~40 |
| `packages/api/src/mcp/index.ts` | ~10 |
| `packages/api/src/mcp/tools/property-tools.ts` | ~80 |
| `packages/api/src/mcp/tools/analysis-tools.ts` | ~70 |
| `packages/api/src/mcp/tools/photo-tools.ts` | ~40 |
| `packages/api/src/mcp/tools/renovation-tools.ts` | ~50 |
| `packages/api/src/mcp/tools/intelligence-tools.ts` | ~60 |
| `packages/api/src/mcp/tools/admin-tools.ts` | ~40 |

## Dependencies

- `@modelcontextprotocol/sdk` npm package
- Epic 02 (Command Handlers) — MCP tools invoke commands for mutations
- Epic 01 (Capability Registry) — tool descriptions come from manifests

## Acceptance Criteria

- [ ] MCP server starts via `tsx packages/api/src/mcp/index.ts`
- [ ] All ~16 tools registered and functional
- [ ] Tools return structured results (not raw DB rows)
- [ ] Error responses include helpful messages
- [ ] Configurable in Claude Code via `.claude/` settings
- [ ] Authentication via env var for user identification
- [ ] Tools respect tier limits and ownership

## Estimated Complexity

Medium — MCP SDK handles protocol. Tools are thin wrappers around existing commands/queries.
