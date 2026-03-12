# packages/shared

> Parent CLAUDE.md covers repo structure, tech stack, and global conventions.

Contract layer for the monorepo. Defines all types, Zod schemas, AI prompts, and constants shared between `api`, `web`, and `e2e`. Imports nothing from the monorepo.

## Purpose & Boundaries

- **Does:** Define domain types, database types, DTOs, Zod validation schemas, AI prompt templates with version constants, tier limits, concurrency settings.
- **Does NOT:** Contain any business logic, runtime behavior, or side effects.
- **Depended on by:** `api`, `web`, `e2e`. **Depends on:** `zod` only.

## Entry Points

`src/index.ts` — barrel re-export. All consumers import from `@str-renovator/shared`.

## Internal Structure

```
src/
├── types/
│   ├── database.ts       ← DB row interfaces (DbProperty, DbAnalysis, etc.)
│   ├── domain.ts         ← Domain models (PhotoAnalysis, ActionItem, PropertyAnalysis)
│   ├── command-response.ts ← CommandResponse<T>, AvailableAction
│   ├── domain-events.ts  ← DomainEvent type definitions
│   ├── dto.ts            ← Request/response DTOs
│   ├── enums.ts          ← Tier, Priority, etc.
│   ├── platform-error.ts ← PlatformError class with factory helpers
│   ├── skill-response.ts ← SkillResponse<T> envelope
│   └── index.ts          ← Type barrel
├── schemas/
│   └── ai-responses.ts   ← Zod schemas validating AI output (PropertyAnalysisSchema, ActionItemSchema, etc.)
├── prompts/
│   └── index.ts          ← All AI prompts + version constants (ANALYSIS_PROMPT_VERSION, etc.)
├── constants/
│   └── index.ts          ← TIER_LIMITS, CONCURRENCY, SUPPORTED_FORMATS, MAX_FILE_SIZE
└── index.ts              ← Root barrel
```

## Local Commands

```bash
npm run build -w @str-renovator/shared   # tsc → dist/
npm run dev -w @str-renovator/shared     # tsc --watch
```

**Must build before `api` or `web` can consume changes.** Turborepo handles this with `dependsOn: ["^build"]`.

## Domain-Specific Patterns

### Prompt Versioning

Every prompt has a version constant (`ANALYSIS_PROMPT_VERSION = "v5"`). When a prompt changes in a way that invalidates cached results, bump the version. All stored AI results include `promptVersion` for traceability.

### Command Response Envelope

All mutations return `CommandResponse<T>`: `{ data, availableActions, events }`. The frontend renders `availableActions` as dynamic UI — never hardcodes available actions.

### PlatformError

Structured error type: `{ code, message, statusCode, recovery[], retryable }`. Use factory methods: `PlatformError.notFound()`, `.validationError()`, `.tierLimitReached()`. For non-standard codes, use `new PlatformError({ code: "...", statusCode: N, message: "..." })`.

## Testing Notes

No tests — this package is pure type/schema definitions. Validated transitively through API tests.
