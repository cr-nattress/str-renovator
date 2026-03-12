# STR Renovator

AI-powered renovation advisor for short-term rental (STR) property owners. Users upload property photos, the system analyzes them with GPT-4o vision, generates renovation recommendations with cost estimates, produces before/after renovation images with DALL-E, and tracks the renovation journey.

Consumers: STR property owners via the web app. AI agents via MCP server.

## Repo Structure

```
str-renovator-app/
├── packages/
│   ├── shared/          ← Contract layer: types, Zod schemas, prompts, constants. Imported by all packages, imports nothing.
│   ├── api/             ← Capability platform: Express REST API, BullMQ jobs, AI skills, commands, repositories.
│   ├── web/             ← React SPA consumer: pages, components, API client hooks. Zero business logic.
│   └── e2e/             ← Playwright E2E tests + web crawler for performance auditing.
├── supabase/
│   └── migrations/      ← Numbered Supabase migration files. Source of truth for schema changes.
├── backlog/             ← Epic-based backlog items (16 epics covering architecture, UI, and AI).
├── docs/
│   └── plans/           ← Implementation plans and design documents.
├── turbo.json           ← Turborepo task config: build, dev, lint, test:e2e.
├── RESUME_PROMPT.md     ← Session handoff document. Read at start of every session.
└── str-design-guidelines.md ← 35KB design system reference for frontend work.
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript (strict, ESM) | 5.7 |
| Backend | Express | 4.21 |
| Database | Supabase (Postgres + Auth + Storage) | 2.49 |
| Job Queue | BullMQ (Redis-backed) | 5.30 |
| AI | OpenAI (GPT-4o chat, DALL-E image edit) | 4.86 |
| Auth | Clerk (Express SDK + React SDK) | 1.3 / 5.20 |
| Frontend | React 19 + Vite + Tailwind 3.4 | — |
| State | TanStack React Query | 5.62 |
| Components | shadcn/ui (Radix + Tailwind) | — |
| E2E Tests | Playwright | 1.49 |
| Unit Tests | Vitest | — |
| Monorepo | npm workspaces + Turborepo 2.3 | — |
| Logging | pino (structured JSON) | 10.3 |

## Build & Dev Commands

```bash
# Install all packages
npm install

# Build shared package (must run first — other packages depend on it)
npm run build:shared

# Dev servers (runs both API + web via Turbo)
npm run dev

# Dev servers individually
npm run dev:api          # Express on :3001
npm run dev:web          # Vite on :5173

# Tests
npm run test             # Vitest unit tests (API package)
npm run test:e2e         # Playwright E2E (requires running dev servers + env vars)
npm run test:e2e:ui      # Playwright with UI mode

# Build everything
npm run build
```

### Required Environment Variables

Create `packages/api/.env` — validated at boot in `packages/api/src/config/env.ts`:

| Variable | Required | Default |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — |
| `OPENAI_API_KEY` | Yes | — |
| `CLERK_SECRET_KEY` | Yes | — |
| `CLERK_WEBHOOK_SECRET` | Yes | — |
| `REDIS_URL` | No | `redis://localhost:6379` |
| `PORT` | No | `3001` |
| `FRONTEND_URL` | No | `http://localhost:5173` |
| `OPENAI_CHAT_MODEL` | No | `gpt-4o` |
| `OPENAI_IMAGE_MODEL` | No | `dall-e-2` |

Frontend needs `VITE_CLERK_PUBLISHABLE_KEY` in `packages/web/.env`.

### Prerequisites

- Node.js (LTS), Redis (for BullMQ), Supabase project (or local via `supabase start`).

## Architecture

```
┌─────────────────────────────────────────────┐
│               CONSUMERS                      │
│   Web SPA  │  MCP Agents  │  CLI             │
└──────────────────┬──────────────────────────┘
                   │  REST + SSE
┌──────────────────▼──────────────────────────┐
│          CAPABILITY PLATFORM (api)           │
│                                              │
│  Routes → Commands → Repositories → Supabase │
│  Routes → Queries → Repositories → Supabase  │
│  Jobs → Steps → Skills → OpenAI Connector    │
│  Events → Handlers (cross-cutting)           │
│  SSE streams for long-running ops            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           SHARED (contract layer)            │
│  Types │ Zod Schemas │ Prompts │ Constants   │
└─────────────────────────────────────────────┘
```

### Three Execution Layers

| Layer | Contains | Example |
|-------|----------|---------|
| **Surface** | React pages, components | `pages/AnalysisView.tsx` |
| **Orchestration** | Commands, job pipelines, routes | `commands/submit-analysis.ts`, `jobs/analyze.job.ts` |
| **Execution** | Skills, connectors, repositories | `skills/analyze-property/`, `connectors/openai.connector.ts` |

### Key Patterns

- **Commands (CQRS):** All mutations go through typed command handlers returning `CommandResponse<T>` with `{ data, availableActions, events }`. The frontend renders `availableActions` as dynamic CTAs — never hardcoded.
- **AI Skills:** Self-contained modules in `api/src/skills/` with `manifest.ts` (schema, model, temperature) and `execute.ts`. Skills are stateless Execution Layer units.
- **Connectors:** Adapters wrapping external services (`openai.connector.ts`, `supabase-storage.connector.ts`, `bullmq.connector.ts`). Platform-internal only.
- **Repository pattern:** All DB access through `repositories/*.repository.ts`. Business logic never touches Supabase client directly.
- **Job pipeline:** Analysis runs as a 7-step BullMQ pipeline: fetch context → batch process → aggregate → create photos → create journey items → enqueue renovations → generate reports → finalize.
- **SSE streaming:** Long-running ops (analysis) stream progress via Server-Sent Events. Frontend passes Clerk JWT as `?token=` query param (EventSource limitation).
- **Event bus:** BullMQ-backed pub/sub for domain events. Cross-cutting concerns (cache invalidation, notifications) subscribe to events.
- **Prompt versioning:** All prompts versioned as constants. Stored AI results include `promptVersion`. Bump version when prompt changes invalidate cached results.

### Coupling Rules

1. `shared` imports nothing from the monorepo.
2. `web` imports only from `shared` — never from `api`.
3. `web` reaches `api` only through REST/SSE.
4. `api` capabilities communicate via the event bus, not direct imports.
5. Skills are stateless — no DB reads, no events, no calling other skills.

## Conventions

### Naming

- Files/dirs: `kebab-case`. Functions: `camelCase`. Types/classes: `PascalCase`. Constants: `SCREAMING_SNAKE_CASE`.
- DB: `snake_case` tables (plural), `{table_singular}_id` foreign keys.
- Routes: REST-style plural — `/api/v1/properties/:id/analyses`.
- Skills: `{verb}-{noun}` kebab-case — `analyze-property`, `edit-image`.
- Commands: `{VerbNoun}` PascalCase — `SubmitAnalysis`, `CreateProperty`.
- Events: past-tense — `PropertyCreated`, `AnalysisCompleted`.

### Code Style

- ESM everywhere (`"type": "module"`), `.js` extensions in imports even for TypeScript.
- Zod for runtime validation at API boundaries.
- Dependency injection: connectors passed to skills, repositories injected into commands.
- Functions ~30 lines max. Files ~300 lines. One primary concept per file.
- Error handling: `PlatformError` with `{ code, message, recovery[], retryable }`. Factory helpers: `.notFound()`, `.validationError()`, `.tierLimitReached()`.

### AI Integration

- All prompts in `shared/src/prompts/index.ts` — never scattered.
- All AI ops through BullMQ — never synchronous in HTTP handlers.
- AI responses validated with Zod schemas before storage.
- AI connector abstraction: services call `openAiConnector.chatCompletion()`, not raw OpenAI client.
- Rate-limited: `p-limit` for chat completions and image generation separately.

## Testing

- **Vitest** (unit/integration): `npm run test`. Tests in `packages/api/src/**/__tests__/`. Mock AI responses — never real AI calls.
- **Playwright** (E2E): `npm run test:e2e`. Sequential specs numbered `01-auth` through `09-listing-data`. Global setup handles Clerk auth. Custom fixtures for seeding, screenshots, API client.
- Test files colocated: `foo.ts` + `__tests__/foo.test.ts`.
- vitest excludes `dist/**` and `node_modules/**` to prevent running stale compiled copies.

## Database

- Schema: `str_renovator` (isolated, not `public`).
- Migrations: `supabase/migrations/` — numbered timestamp files.
- Key tables: `users`, `properties`, `photos`, `analyses`, `analysis_batches`, `analysis_photos`, `renovations`, `design_journey_items`, `scrape_jobs`, `feedback`, `edit_history`.
- RLS enabled but tenant isolation enforced in Express middleware (service role key). Intentional.
- `updated_at` columns use shared trigger function.
- Soft delete with `is_active` flags.

## Key Files

| File | Why it matters |
|------|---------------|
| `packages/shared/src/prompts/index.ts` | All AI prompts with version constants. Change here = bump version. |
| `packages/shared/src/types/domain.ts` | Domain model types used everywhere. |
| `packages/shared/src/constants/index.ts` | Tier limits, concurrency settings, file constraints. |
| `packages/api/src/config/env.ts` | Env validation. App won't start if vars missing. |
| `packages/api/src/app.ts` | Express middleware stack and route mounting order matters. |
| `packages/api/src/jobs/analyze.job.ts` | 7-step analysis pipeline orchestrator. |
| `packages/api/src/connectors/openai.connector.ts` | All AI calls go through this. |
| `packages/api/src/middleware/auth.ts` | Clerk auth + DB user lookup. Extends `Express.Request` with `dbUser`. |
| `RESUME_PROMPT.md` | Session handoff doc. Read at start of every dev session. |

## Common Gotchas

- **Build order:** `shared` must build before `api` or `web`. Run `npm run build:shared` after changing shared types.
- **Import extensions:** Always use `.js` extensions in TypeScript imports (`import { x } from "./foo.js"`). ESM requires it.
- **SSE auth:** EventSource API can't set headers. The `?token=` query param workaround in `app.ts` copies it to `Authorization` header before Clerk middleware runs.
- **Webhooks raw body:** Webhook route mounted BEFORE `express.json()` parser — needs raw body for Svix signature verification. Don't reorder `app.ts` middleware.
- **vitest + Playwright conflict:** Running vitest from root picks up Playwright test files and they crash. Always scope vitest runs: `--dir packages/api` or use the workspace test script.
- **DB user required:** All `/api/v1` routes go through `requireAuth` which attaches `req.dbUser`. The user must exist in `users` table (created by Clerk webhook).

## Do Not Touch

- `node_modules/`, `dist/` — generated.
- `supabase/.gitignore` contents — Supabase CLI generated config.
- `packages/web/src/components/ui/` — shadcn/ui generated primitives. Modify via shadcn CLI, not by hand.
- `package-lock.json` — auto-generated. Don't manually edit.
