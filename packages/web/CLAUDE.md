# packages/web

> Parent CLAUDE.md covers repo structure, tech stack, architecture, and global conventions.

React SPA — pure Surface Layer consumer of the capability platform. Renders UI, translates user intent into API calls, consumes SSE streams, manages local UI state. Contains zero business logic.

## Purpose & Boundaries

- **Does:** Render pages, manage auth state (Clerk), fetch/mutate data (React Query), display AI results with transparency components, stream analysis progress.
- **Does NOT:** Contain business logic, data transformation, or direct external service calls. All logic lives in `packages/api`.
- **Depended on by:** `e2e` (via browser). **Depends on:** `@str-renovator/shared` (types only), Clerk React SDK, TanStack React Query.

## Entry Points

- `src/main.tsx` — Bootstrap: StrictMode → ClerkProvider → QueryClientProvider → BrowserRouter → ToastProvider → App.
- `src/router.tsx` — React Router v7 route definitions.
- `src/App.tsx` — SignedOut/SignedIn shell with `AppShell` layout.

## Internal Structure

```
src/
├── pages/               ← 8 page components. Each owns its data fetching.
│   ├── Dashboard.tsx
│   ├── PropertyDetail.tsx
│   ├── AnalysisView.tsx
│   ├── RenovationView.tsx
│   ├── DesignJourney.tsx
│   ├── JourneyItemDetail.tsx
│   ├── Pricing.tsx
│   └── Usage.tsx
├── api/                 ← API client modules. Each exports React Query hooks.
│   ├── client.ts        ← apiFetch() base function with Clerk token injection
│   ├── api-error.ts     ← ApiError class wrapping PlatformError responses
│   ├── analyses.ts, properties.ts, photos.ts, renovations.ts, journey.ts, etc.
├── components/
│   ├── ui/              ← shadcn/ui primitives (button, dialog, input, etc.). Generated — modify via shadcn CLI.
│   ├── ai/              ← AI transparency: ConfidenceIndicator, ReasoningExpander
│   ├── analysis/        ← ActionPlanTable, PhotoAnalysisCard, PropertyAssessment
│   ├── photos/          ← PhotoUpload, PhotoCompare, PhotoGrid
│   ├── properties/      ← PropertyCard, PropertyForm
│   ├── renovation/      ← RenovationFeedback, RenovationHistory
│   ├── design-journey/  ← JourneyItemCard, BudgetTracker
│   ├── layout/          ← AppShell (sidebar + main content)
│   ├── skeletons.tsx    ← Skeleton loaders for all views
│   └── ErrorAlert.tsx   ← Renders PlatformError with recovery actions
├── hooks/               ← Custom React hooks
├── lib/                 ← Utilities (cn(), etc.)
└── index.css            ← Tailwind imports + custom properties
```

## Local Commands

```bash
npm run dev -w @str-renovator/web     # Vite dev server on :5173
npm run build -w @str-renovator/web   # tsc + vite build → dist/
```

Requires `VITE_CLERK_PUBLISHABLE_KEY` in `.env`. Dev proxy: `/api` → `http://localhost:3001` (configured in `vite.config.ts`).

## Domain-Specific Patterns

### API Client Pattern

Each `api/*.ts` file exports TanStack React Query hooks (`useQuery` / `useMutation`). All use `apiFetch()` which injects Clerk Bearer token and handles `PlatformError` responses. Pages own their data fetching — no global data store.

```typescript
// Pattern: every API module exports hooks
export function useAnalysis(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AnalysisWithDetails>(`/api/v1/analyses/${id}`, token!);
    },
  });
}
```

### Available Actions → Dynamic CTAs

`CommandResponse.availableActions` drives all action buttons. The `ActionBar` component renders them. The frontend never hardcodes which actions are available — the API decides based on entity state.

### AI Transparency Components

- `ConfidenceIndicator` — colored badge mapping 0.0–1.0 to Low/Medium/High. High values pulse.
- `ReasoningExpander` — expandable "Why?" panel showing AI reasoning.
- Used on: `PropertyAssessment`, `PhotoAnalysisCard`, `ActionPlanTable`.

### Path Alias

`@/*` maps to `./src/*` (configured in `vite.config.ts` and `tsconfig.app.json`). Use for all imports: `import { Button } from "@/components/ui/button"`.

### SSE Streaming

Analysis progress streamed via EventSource. Token passed as `?token=` query param (EventSource can't set headers). React Query caches invalidated on SSE completion events.

## Testing Notes

No unit tests in this package. All frontend testing via Playwright E2E in `packages/e2e/`.
