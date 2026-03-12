# Retry Failed Batches — Design

## Overview

Add a "Retry Failed Batches" command that re-runs only the failed batches of a `partially_completed` or `failed` analysis, then continues through the full pipeline (aggregate → journey items → renovation images).

## Architecture

**New command:** `RetryAnalysisBatches` — validates the analysis is retryable, resets batch/analysis counters, sets status back to `analyzing`, and enqueues the existing analysis job.

**Modified pipeline step:** `processBatches` gains a "retry mode" — instead of creating new batch records, it queries existing batches and only processes those with `status = "failed"` or `"pending"`. Completed batches are left untouched.

**No new API patterns needed:** `POST /analyses/:id/retry` follows the existing action endpoint convention. The frontend already handles a `"retry-analysis"` action command.

## Data Flow

```
User clicks "Retry Failed Batches"
  → POST /api/v1/analyses/:id/retry
  → RetryAnalysisBatches command:
      1. Validate analysis.status in ["partially_completed", "failed"]
      2. Reset: failed_batches → 0, status → "analyzing"
      3. Reset failed batch rows: status → "pending", error → null
      4. enqueueAnalysis(analysisId, propertyId, userId, { retry: true })
  → BullMQ analysis job (same as today, but with retry flag):
      1. fetchContext (same)
      2. processBatches — detects retry flag, skips batch creation,
         only processes batches with status "pending" or "failed"
      3. aggregateResults — reads ALL completed batches (unchanged)
      4. createAnalysisPhotos (same)
      5. createJourneyItems — upsert handles dedup (unchanged)
      6. enqueueRenovations (same)
      7. finalizeAnalysis (same)
```

## Key Invariant

The aggregation step (`analysisBatchRepo.listCompleted()`) already only reads completed batches. When failed batches are re-run and succeed, they join the previously-completed batches naturally — no special merge logic needed.

## Available Actions Change

`computeAnalysisActions` adds `"Retry Failed Batches"` for both `partially_completed` and `failed` statuses. This replaces the current "Retry Analysis" action on `failed` (which today just creates a new analysis).

## Frontend Change

Minimal — `AnalysisView.tsx` `handleAction` already has a `"retry-analysis"` case. Change it to call `POST /analyses/:id/retry` instead of creating a new analysis, and stay on the same page (the SSE stream will show progress).

## Error Handling

- If retry itself fails, the analysis returns to `failed`/`partially_completed` (same as today's error handling in the job).
- If the analysis is already in a non-retryable state (e.g. `analyzing`, `completed`), the command returns a 409 Conflict.
- Monthly quota is NOT decremented for retries — only fresh analyses count.

## Files Touched

| File | Change |
|---|---|
| `packages/api/src/commands/retry-analysis-batches.ts` | **New** — the command |
| `packages/api/src/routes/analyses.ts` | Add `POST /:id/retry` route |
| `packages/api/src/jobs/analyze.job.ts` | Pass `retry` flag through to steps |
| `packages/api/src/jobs/steps/process-batches.ts` | Skip batch creation in retry mode, only process pending/failed |
| `packages/api/src/repositories/analysis-batch.repository.ts` | Add `resetFailed(analysisId)` method |
| `packages/api/src/actions/analysis-actions.ts` | Add retry action for `partially_completed` and `failed` |
| `packages/api/src/services/queue.service.ts` | Accept `retry` flag in `enqueueAnalysis` |
| `packages/web/src/pages/AnalysisView.tsx` | Change retry handler to call new endpoint |
| `packages/web/src/api/analyses.ts` | Add `useRetryAnalysis` mutation hook |
| `packages/shared/src/manifests/commands.ts` | Register `RetryAnalysisBatches` command |
