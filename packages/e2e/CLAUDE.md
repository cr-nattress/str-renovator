# packages/e2e

> Parent CLAUDE.md covers repo structure, tech stack, and global conventions.

Playwright E2E test suite + web crawler for performance auditing. Tests full user journeys against running dev servers with real Clerk authentication.

## Purpose & Boundaries

- **Does:** E2E testing of web UI + API integration, accessibility auditing (axe-core), web crawling for error discovery.
- **Does NOT:** Unit test individual components or services. That's Vitest in `packages/api`.
- **Depends on:** Running `api` + `web` dev servers, Clerk test credentials, Supabase with seeded data.

## Entry Points

- `playwright.config.ts` — main test configuration.
- `playwright.crawl.config.ts` — web crawler configuration.
- `global.setup.ts` — Clerk authentication via browser (saves storage state).
- `global.teardown.ts` — cleanup.

## Internal Structure

```
├── tests/               ← Numbered test specs (sequential execution)
│   ├── 01-auth.spec.ts
│   ├── 02-dashboard.spec.ts
│   ├── 03-property-detail.spec.ts
│   ├── 04-analysis-view.spec.ts
│   ├── 05-renovation-view.spec.ts
│   ├── 06-design-journey.spec.ts
│   ├── 07-pricing.spec.ts
│   ├── 08-uiux-audit.spec.ts     ← axe-core WCAG 2.0/2.1 AA
│   └── 09-listing-data.spec.ts
├── fixtures/
│   ├── index.ts         ← Merged fixture combining auth, api, screenshot, seed
│   ├── auth.fixture.ts  ← Clerk authentication fixture
│   ├── api.fixture.ts   ← Direct API client for backend
│   ├── seed.fixture.ts  ← Test data creation
│   └── screenshot.fixture.ts
├── crawl/               ← Web crawler for performance/error auditing
├── helpers/             ← Test utilities
└── scripts/             ← Helper scripts
```

## Local Commands

```bash
npm run test:e2e                    # Run all E2E tests
npm run test:e2e:ui                 # Playwright UI mode
npm run test:e2e:report             # Open last HTML report
npm run crawl                       # Crawl site for errors
npm run crawl:full                  # Full crawl with screenshots
npm run crawl:analyze               # Analyze crawl results
```

### Required Environment

- Running `api` on `:3001` and `web` on `:5173`.
- Clerk test credentials: `E2E_CLERK_USER_EMAIL`, `E2E_CLERK_USER_PASSWORD` (or equivalent in `.env`).
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for the test Clerk instance.
- Seeded Supabase data (or seed fixture handles it).

## Domain-Specific Patterns

### Sequential Execution

Tests run in numbered order with a single worker. This is intentional — tests build on shared state (authenticated user, created properties). Order matters.

### Fixture Composition

All fixtures merged in `fixtures/index.ts`. Test files import from `../fixtures`:
```typescript
import { test, expect } from "../fixtures";
test("...", async ({ authedPage: page, apiClient }) => { ... });
```

### Global Auth Setup

`global.setup.ts` authenticates via Clerk in a real browser, saves storage state to `.playwright/storageState.json`. All subsequent tests reuse this state.

## Testing Notes

- HTML reporter output: `reports/html/`.
- Screenshots on failure (automatic).
- `screenshotHelpers/` directory for manual screenshot utilities.
- Tests use `@axe-core/playwright` for accessibility auditing.

## Known Issues

- Playwright test files crash if picked up by Vitest (different test runner APIs). The API vitest.config.ts excludes them, but don't run vitest from root without `--dir`.
