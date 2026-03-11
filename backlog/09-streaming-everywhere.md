# Epic 09: Extend SSE Streaming to All Long-Running Operations

## Summary

Extend the existing SSE streaming pattern (currently only used for analysis) to scrape jobs, image generation, and location research. Replace polling with real-time progress streams that include descriptive status copy, partial results, and suggested actions.

## Why

The CLAUDE.md vision states: "Always show progress — any AI op >5s needs SSE with meaningful copy" and "Stream partial skill results as they arrive — never block on full completion."

Currently:
- Analysis: SSE streaming (good)
- Scrape jobs: Polling every 2 seconds via `useScrapeJob` with `refetchInterval: 2000`
- Image generation: No progress — just a spinner until complete
- Location research: No progress — fire-and-forget with query invalidation

## Current State

### Analysis SSE (the pattern to replicate)

**Backend:** `routes/analyses.ts` — `GET /analyses/:id/stream`
- Polls DB every 2s via `setInterval`
- Sends events: `status`, `progress`, `batch_progress`, `error`, `done`
- Client disconnect cleanup via `req.on("close")`

**Frontend:** `hooks/useRealtimeUpdates.ts`
- Opens `EventSource` with token in query string
- Dispatches events to callbacks
- Manages connection state (connected, disconnected, error)

**UI:** `components/analysis/AnalysisProgress.tsx`
- Shows step indicators with status badges
- Progress bars for photos and batches
- Descriptive copy for each phase

### Scrape Job (currently polling)

**Backend:** `routes/scrape.ts` — `GET /scrape-jobs/:id` (regular REST endpoint)
**Frontend:** `api/scrape.ts` — `useScrapeJob(jobId)` with `refetchInterval: 2000`
**UI:** `components/photos/ScrapeStatus.tsx` — shows phase name + progress bar

Scrape phases that would benefit from streaming:
1. `scraping` — "Extracting photos and page content..."
2. `extracting_data` — "AI is analyzing the listing..."
3. `analyzing_reviews` — "Reading guest reviews..."
4. `downloading` — "Downloading photos (3/15)..."
5. `researching_location` — "Researching the local market..."
6. `synthesizing` — "Building property intelligence profile..."
7. `completed` / `failed`

### Image Generation (no progress)

Currently shows a shimmer placeholder or spinner. No way to know if generation is 10% or 90% done.

## Scope

### 1. Create Generic SSE Stream Utility

**File:** `packages/api/src/streams/create-sse-stream.ts`

Extract the SSE pattern from `analyses.ts` into a reusable utility:

```typescript
interface StreamOptions<T> {
  pollFn: () => Promise<T | null>;
  intervalMs?: number;
  isTerminal: (data: T) => boolean;
  mapToEvents: (data: T, prev: T | null) => SSEEvent[];
}

function createSSEStream<T>(req: Request, res: Response, options: StreamOptions<T>): void;
```

### 2. Add Scrape Job SSE Endpoint

**Route:** `GET /scrape-jobs/:id/stream`

Events:
```typescript
{ type: "status", status: "scraping", message: "Extracting photos and page content..." }
{ type: "status", status: "extracting_data", message: "AI is analyzing the listing data..." }
{ type: "status", status: "analyzing_reviews", message: "Analyzing guest reviews..." }
{ type: "progress", completed: 5, total: 15, message: "Downloading photos..." }
{ type: "status", status: "researching_location", message: "Researching the local market..." }
{ type: "status", status: "synthesizing", message: "Building property intelligence..." }
{ type: "done", message: "Scrape complete! Found 15 photos and extracted listing data." }
{ type: "error", message: "Scraping failed: could not access listing page" }
```

### 3. Add Renovation SSE Endpoint

**Route:** `GET /renovations/:id/stream`

Events:
```typescript
{ type: "status", status: "processing", message: "Generating renovation preview..." }
{ type: "done", message: "Renovation image ready!" }
{ type: "error", message: "Image generation failed" }
```

### 4. Create Generic `useStreamProgress` Hook

**File:** `packages/web/src/hooks/useStreamProgress.ts`

Generalize `useRealtimeUpdates` to work with any entity:

```typescript
function useStreamProgress(url: string, options?: {
  enabled?: boolean;
  onStatus?: (status: string, message: string) => void;
  onProgress?: (completed: number, total: number) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}): {
  isConnected: boolean;
  currentStatus: string | null;
  currentMessage: string | null;
  progress: { completed: number; total: number } | null;
}
```

### 5. Update ScrapeStatus Component

Replace polling-based `ScrapeStatus.tsx` with SSE-based progress:
- Uses `useStreamProgress('/api/v1/scrape-jobs/:id/stream')`
- Shows descriptive copy for each phase
- Shows photo download progress bar
- Invalidates React Query cache on `done` event

### 6. Enrich SSE Events with Descriptive Messages

Update the scrape job to write descriptive `status_message` to the DB alongside status:

```typescript
await scrapeJobRepo.updateStatus(scrapeJobId, "extracting_data", {
  status_message: "AI is analyzing the listing page to extract property details..."
});
```

The SSE stream reads this message and includes it in events.

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/api/src/streams/create-sse-stream.ts` | ~50 |
| `packages/web/src/hooks/useStreamProgress.ts` | ~60 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routes/scrape.ts` | Add `GET /scrape-jobs/:id/stream` SSE endpoint |
| `packages/api/src/routes/renovations.ts` | Add `GET /renovations/:id/stream` SSE endpoint |
| `packages/api/src/routes/analyses.ts` | Refactor to use `createSSEStream` utility |
| `packages/api/src/jobs/scrape.job.ts` | Add `status_message` to each phase update |
| `packages/web/src/components/photos/ScrapeStatus.tsx` | Switch from polling to SSE |
| `packages/web/src/api/scrape.ts` | Remove `refetchInterval` polling |
| `packages/shared/src/types/events.ts` | Add `message` field to SSE event types |

## Acceptance Criteria

- [ ] Scrape jobs stream real-time progress with descriptive messages
- [ ] Analysis streaming refactored to use shared `createSSEStream` utility
- [ ] `useStreamProgress` hook works for any streamable entity
- [ ] ScrapeStatus component uses SSE instead of polling
- [ ] Each scrape phase shows descriptive human-readable message
- [ ] Photo download shows numeric progress (3/15)
- [ ] React Query cache invalidated on stream completion
- [ ] Connection cleanup on client disconnect

## Dependencies

None — can be done independently. Uses existing SSE infrastructure as a pattern.

## Estimated Complexity

Medium — generalizing existing SSE pattern + adding 2 new endpoints + updating frontend.
