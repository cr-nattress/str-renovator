# Resume Context: STR Renovator App

## Project Summary

STR Renovator is an AI-powered property renovation tool for short-term rental hosts. It analyzes listing photos via GPT-4o Vision, generates renovation recommendations, creates before/after images via DALL-E, and provides a design journey for tracking renovations.

**Stack:** Express API + Supabase (Postgres/Auth/Storage) + BullMQ | React SPA + Vite + TanStack Query + shadcn/ui | Clerk auth | Shared monorepo package

## Current State

The app has undergone a comprehensive architectural refactoring across multiple sessions, following the plan at `~/.claude/plans/nifty-churning-simon.md`. All P0, P1, P2, and most P3 items are complete.

### Completed Refactoring Items

**P0 (Critical):**
- Atomic counter increments via Postgres RPC
- Retry config on all BullMQ queues
- Helmet security middleware

**P1 (High Priority):**
- pino structured logging replacing all console.log
- PlatformError type with codes, recovery actions, retryable flag
- Zod runtime validation for AI responses
- Dead-letter queues for all BullMQ queues
- OpenAI rate limiting via p-limit
- Sentry error tracking
- Prompt version constants for all 8 prompts
- AI metadata DB columns (prompt_version, model, tokens_used)
- AI metadata capture in all service layer functions (AiResult<T>)

**P2 (Medium Priority):**
- Decomposed analyze.job.ts into pipeline steps
- Repository pattern for all database access (10 repository files)
- Unit tests for all AI services + route integration tests (47 tests)
- SkillResponse<T> and CommandResponse<T> types
- Shared package restructured into feature folders
- Frontend error UX with PlatformError
- shadcn/ui migration (11 UI primitives, 12 migrated components)
- Skeleton loaders on all 6 pages

**P3 (Backlog):**
- Zustand removed (was unused)
- Configurable model names via env vars
- Analysis prompt v2 with confidence/reasoning fields
- ConfidenceIndicator and ReasoningExpander AI transparency components
- EditableText component + PATCH /analyses/:id endpoint
- Token usage dashboard (UsageDashboard + /usage page)

### Remaining Items (deferred)
- **P3-UX-2 (Generative UI):** Premature — no contentType in API responses yet
- **P3-UX-4 (Undo/Rollback):** Large effort — needs action_history DB table + API + UI
- **P3-AR-3 (E2E Tests):** Needs running server + real DB infrastructure

## Key Architecture

- **Repositories:** `packages/api/src/repositories/` — one per entity (property, analysis, photo, renovation, etc.)
- **AI Services:** Return `AiResult<T>` with `{ data, metadata: { model, tokensUsed, promptVersion } }`
- **Error Handling:** `PlatformError` thrown from routes/services, caught by Express error middleware, frontend `ApiError` + `ErrorAlert`
- **UI Components:** shadcn/ui in `packages/web/src/components/ui/`, AI components in `components/ai/`
- **Prompts:** `packages/shared/src/prompts/index.ts` — 8 prompt templates with version constants
- **Schemas:** `packages/shared/src/schemas/ai-responses.ts` — Zod schemas for all AI response types

## Important Files

| File | Purpose |
|------|---------|
| `packages/shared/src/prompts/index.ts` | All prompt templates + version constants |
| `packages/shared/src/types/domain.ts` | Core domain types (PropertyAnalysis, AiResult, etc.) |
| `packages/shared/src/types/platform-error.ts` | PlatformError class |
| `packages/shared/src/schemas/ai-responses.ts` | Zod validation schemas |
| `packages/api/src/config/env.ts` | Environment config with validation |
| `packages/api/src/config/rate-limiter.ts` | OpenAI rate limiting |
| `packages/api/src/jobs/steps/` | Pipeline step files for analyze job |
| `packages/web/src/components/ui/` | shadcn/ui primitives |
| `packages/web/src/components/ai/` | AI transparency components |
| `packages/web/src/api/api-error.ts` | Frontend error handling |

## Database

- Schema: `str_renovator` (configured in supabase.ts)
- Migrations: `packages/api/src/db/001_init.sql` through `006_*.sql`
- AI metadata columns on: analyses, analysis_batches, renovations, design_journey_items
- Atomic counter RPC: `increment_counter(p_table, p_column, p_id)`
