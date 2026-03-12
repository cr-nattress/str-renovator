# packages/api

> Parent CLAUDE.md covers repo structure, tech stack, architecture, and global conventions.

Capability platform — all business logic, AI orchestration, data access, and external integrations. Express REST API with BullMQ job processing, AI skills, and an MCP server for agent tooling.

## Purpose & Boundaries

- **Does:** Serve REST API, run background jobs (analysis, renovation, scraping), orchestrate AI skills, manage data via repositories, stream progress via SSE, expose MCP tools.
- **Does NOT:** Render UI, contain frontend logic, or serve static files.
- **Depended on by:** `web` (via REST/SSE), `e2e` (via HTTP), MCP clients. **Depends on:** `@str-renovator/shared`, OpenAI, Supabase, Redis/BullMQ, Clerk.

## Entry Points

- `src/server.ts` — starts Express server, registers event handlers, starts BullMQ workers.
- `src/app.ts` — Express app with middleware stack. Exported separately for supertest.
- `src/mcp/index.ts` — MCP server entry point (`npm run mcp`).

## Internal Structure

```
src/
├── config/              ← env.ts (validated env), logger.ts, openai.ts, rate-limiter.ts, queue.ts, supabase.ts
├── middleware/          ← auth.ts (Clerk + dbUser), error.ts (global handler), tier.ts, request-logger.ts
├── routes/             ← Express routers. Thin handlers that delegate to commands/queries.
│   └── __tests__/      ← Route integration tests (supertest)
├── commands/           ← 18 CQRS command handlers. All mutations go here.
│   └── execute.ts      ← Generic command router
├── repositories/       ← One per entity. All DB access abstracted here.
├── services/           ← Business services (batch processing, LLM orchestration, scraping)
│   └── __tests__/      ← Service unit tests
├── skills/             ← AI skills, each a directory with manifest.ts + execute.ts
├── jobs/               ← BullMQ job processors
│   ├── steps/          ← 8 analysis pipeline steps (fetch-context, process-batches, aggregate, etc.)
│   └── worker.ts       ← Registers all job processors
├── connectors/         ← External service adapters (OpenAI, Supabase Storage, BullMQ)
├── events/             ← Event bus (BullMQ-backed) + domain event handlers
├── actions/            ← Computes available actions for entities based on current state
├── streams/            ← SSE stream creation utilities
├── mcp/                ← MCP server: tool definitions and implementations
├── db/                 ← Local schema reference SQL files
└── scripts/            ← Utility scripts
```

## Local Commands

```bash
npm run dev -w @str-renovator/api     # tsx watch on :3001
npm run build -w @str-renovator/api   # tsc → dist/
npm run test -w @str-renovator/api    # vitest
npm run mcp -w @str-renovator/api     # start MCP server
```

## Domain-Specific Patterns

### Command Handlers

Every state mutation is a command in `src/commands/`. Signature: `(input: TypedInput, ctx: CommandContext) => Promise<CommandResult<T>>`. Commands validate, execute business rules, call repositories, publish events, and return `{ data, events, availableActions }`.

### AI Skills

Each skill directory has:
- `manifest.ts` — `SKILL_MANIFEST` with id, model, temperature, maxTokens, tags, I/O descriptions.
- `execute.ts` — stateless function taking typed input, calling `openAiConnector.chatCompletion()`, validating response with Zod, returning `AiResult<T>`.

Skills never read from DB, emit events, or call other skills.

### Analysis Pipeline (7-step job)

`jobs/analyze.job.ts` orchestrates: `fetchContext` → `processBatches` → `aggregateResults` → `createAnalysisPhotos` → `createJourneyItems` → `enqueueRenovations` → `generateReports` → `finalizeAnalysis`. Each step is an independent module in `jobs/steps/`. Supports retry mode — reprocesses only failed/pending batches.

### Connector Pattern

External services wrapped in typed connectors implementing interfaces:
- `AiConnector` → `openAiConnector` (chat + image via OpenAI)
- `StorageConnector` → Supabase Storage
- `QueueConnector` → BullMQ

### Routes → Commands (not services)

Routes are thin: parse request, call command/query, return response. Business logic lives in commands, not route handlers. Route tests use supertest against the Express app with mocked dependencies.

### Available Actions

`src/actions/` computes context-sensitive actions for entities. For example, an analysis in `partially_completed` status gets a "Retry Failed Batches" action. The frontend renders these dynamically.

## State & Side Effects

- **Postgres (Supabase):** All persistent state. Schema: `str_renovator`.
- **Redis:** BullMQ job state, rate limiting.
- **Supabase Storage:** Photo uploads, renovation images.
- **OpenAI:** Chat completions (GPT-4o), image edits (DALL-E).
- **SSE:** Real-time progress streaming to frontend.

## Testing Notes

```bash
# Run all API unit tests
npx vitest run --config packages/api/vitest.config.ts --dir packages/api

# Run specific test file
npx vitest run --config packages/api/vitest.config.ts packages/api/src/routes/__tests__/properties.test.ts
```

- Tests in `__tests__/` directories alongside source.
- Mocked: Supabase (custom chainable mock in `helpers/supabase-mock.ts`), Clerk, OpenAI, BullMQ, storage.
- `vitest.config.ts` excludes `dist/**` and `node_modules/**`.
- `globals: true` — no need to import `describe`, `it`, `expect`.
- AI responses always mocked — never real API calls in tests.

## Active Work / Known Issues

- `tsc` reports errors on test files because vitest globals aren't in tsconfig types. Tests run fine with vitest. Pre-existing, not blocking.
- E2E tests in `packages/e2e/` crash if picked up by vitest — always scope runs to `packages/api`.
