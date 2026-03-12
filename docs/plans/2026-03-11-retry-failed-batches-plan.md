# Retry Failed Batches Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to retry only the failed batches of a `partially_completed` or `failed` analysis, then re-run the full downstream pipeline.

**Architecture:** New `RetryAnalysisBatches` command resets failed batch rows and re-enqueues the existing analysis job with a `retry: true` flag. The `processBatches` step detects retry mode and only processes pending/failed batches. Aggregation naturally incorporates all completed batches.

**Tech Stack:** Express, Supabase (Postgres), BullMQ, React + TanStack Query

---

### Task 1: Add `resetFailed` to analysis-batch repository

**Files:**
- Modify: `packages/api/src/repositories/analysis-batch.repository.ts`

**Step 1: Add `listByAnalysis` and `resetFailed` methods**

Append these two functions to `packages/api/src/repositories/analysis-batch.repository.ts`:

```typescript
export async function listByAnalysis(
  analysisId: string
): Promise<DbAnalysisBatch[]> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("batch_index");
  if (error) throw error;
  return (data ?? []) as DbAnalysisBatch[];
}

export async function resetFailed(
  analysisId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("analysis_batches")
    .update({ status: "pending", error: null })
    .eq("analysis_id", analysisId)
    .eq("status", "failed")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
```

**Step 2: Verify compilation**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/api/src/repositories/analysis-batch.repository.ts
git commit -m "feat(repo): add listByAnalysis and resetFailed to batch repository"
```

---

### Task 2: Add `retry` flag to queue service and job data

**Files:**
- Modify: `packages/api/src/services/queue.service.ts:22-35`
- Modify: `packages/api/src/jobs/analyze.job.ts:27-33`

**Step 1: Add `retry` flag to `enqueueAnalysis`**

In `packages/api/src/services/queue.service.ts`, change the `enqueueAnalysis` function signature and body:

```typescript
export async function enqueueAnalysis(
  analysisId: string,
  propertyId: string,
  userId: string,
  quality: ImageQuality,
  size: ImageSize,
  retry?: boolean
): Promise<void> {
  await bullMqConnector.enqueue(
    "analysis",
    "analyze",
    { analysisId, propertyId, userId, quality, size, retry: retry ?? false },
    DEFAULT_RETRY
  );
}
```

**Step 2: Add `retry` to `AnalysisJobData` interface**

In `packages/api/src/jobs/analyze.job.ts`, update the interface at line 27:

```typescript
interface AnalysisJobData {
  analysisId: string;
  propertyId: string;
  userId: string;
  quality: ImageQuality;
  size: ImageSize;
  retry: boolean;
}
```

And update the destructuring at line 38 to include `retry`:

```typescript
const { analysisId, propertyId, userId, quality, size, retry } = job.data;
```

Then pass `retry` to the `processBatches` call at line 49:

```typescript
const { completedCount, failedCount } = await processBatches(analysisId, typedPhotos, context, log, retry);
```

**Step 3: Verify compilation**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -10`
Expected: Error about `processBatches` signature mismatch (expected — fixed in Task 3)

**Step 4: Commit**

```bash
git add packages/api/src/services/queue.service.ts packages/api/src/jobs/analyze.job.ts
git commit -m "feat: add retry flag to analysis queue and job data"
```

---

### Task 3: Add retry mode to `processBatches`

**Files:**
- Modify: `packages/api/src/jobs/steps/process-batches.ts`

**Step 1: Update `processBatches` to support retry mode**

Replace the entire function in `packages/api/src/jobs/steps/process-batches.ts`:

```typescript
import pLimit from "p-limit";
import * as batchService from "../../services/batch.service.js";
import * as analysisBatchRepo from "../../repositories/analysis-batch.repository.js";
import { CONCURRENCY, type DbPhoto } from "@str-renovator/shared";
import type { Logger } from "pino";
import * as analysisRepo from "../../repositories/analysis.repository.js";
import { serializeError } from "../../config/errors.js";

export interface BatchResult {
  completedCount: number;
  failedCount: number;
}

export async function processBatches(
  analysisId: string,
  typedPhotos: DbPhoto[],
  context: string | undefined,
  log: Logger,
  retry: boolean = false
): Promise<BatchResult> {
  let batches;

  if (retry) {
    // Retry mode: use existing batch records, only process pending/failed
    const allBatches = await analysisBatchRepo.listByAnalysis(analysisId);
    batches = allBatches.filter((b) => b.status === "pending" || b.status === "failed");
    log.info({ totalBatches: allBatches.length, retryBatches: batches.length }, "retry mode: processing pending/failed batches only");

    if (batches.length === 0) {
      log.info("no batches to retry — all already completed");
      return { completedCount: 0, failedCount: 0 };
    }

    // Reset status to analyzing (counters were already reset by the command)
    await analysisRepo.updateStatus(analysisId, "analyzing");
  } else {
    // Normal mode: create new batch records
    batches = await batchService.createBatchRecords(
      analysisId,
      typedPhotos,
      CONCURRENCY.analysisBatchSize
    );
    await analysisRepo.updateStatus(analysisId, "analyzing", { total_batches: batches.length });
  }

  const limit = pLimit(CONCURRENCY.analysisBatchConcurrency);
  let completedCount = 0;
  let failedCount = 0;

  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        try {
          await batchService.processSingleBatch(
            batch,
            typedPhotos,
            context,
            batches.length
          );
          completedCount++;
          await analysisRepo.incrementCounter("completed_batches", analysisId);
        } catch (err) {
          failedCount++;
          await analysisRepo.incrementCounter("failed_batches", analysisId);
          log.error(
            { batchIndex: batch.batch_index, err: serializeError(err) },
            "batch failed"
          );
        }
      })
    )
  );

  if (completedCount === 0 && !retry) {
    throw new Error(
      `All ${batches.length} batches failed. Analysis cannot proceed.`
    );
  }

  // In retry mode, even if all retried batches fail again, there may still be
  // previously-completed batches — so don't throw. The aggregation step will
  // determine if there's enough data to proceed.

  return { completedCount, failedCount };
}
```

**Step 2: Verify compilation**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/api/src/jobs/steps/process-batches.ts
git commit -m "feat: add retry mode to processBatches — reuse existing batch records"
```

---

### Task 4: Create `RetryAnalysisBatches` command

**Files:**
- Create: `packages/api/src/commands/retry-analysis-batches.ts`
- Modify: `packages/api/src/commands/index.ts`

**Step 1: Create the command file**

Create `packages/api/src/commands/retry-analysis-batches.ts`:

```typescript
/**
 * @module retry-analysis-batches
 * @capability RetryAnalysisBatches command handler
 * @layer Orchestration
 *
 * Retries only the failed batches of a partially_completed or failed analysis.
 * Resets failed batch rows to pending, resets failure counters, and re-enqueues
 * the analysis job with a retry flag so the pipeline skips batch creation.
 *
 * Does NOT decrement the user's monthly analysis quota — retries are free.
 */

import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";
import { enqueueAnalysis } from "../services/queue.service.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import * as analysisBatchRepo from "../repositories/analysis-batch.repository.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface RetryAnalysisBatchesInput {
  analysisId: string;
}

const RETRYABLE_STATUSES = ["partially_completed", "failed"];

export async function retryAnalysisBatches(
  input: RetryAnalysisBatchesInput,
  ctx: CommandContext,
): Promise<CommandResult<{ id: string; status: string }>> {
  const { analysisId } = input;

  // Verify ownership
  const analysis = await analysisRepo.findByIdAndUser(analysisId, ctx.userId);
  if (!analysis) {
    throw PlatformError.notFound("Analysis", analysisId);
  }

  // Validate retryable status
  if (!RETRYABLE_STATUSES.includes(analysis.status)) {
    throw PlatformError.conflict(
      `Analysis is in "${analysis.status}" state and cannot be retried. ` +
      `Only partially_completed or failed analyses can be retried.`
    );
  }

  // Reset failed batch rows to pending
  const resetCount = await analysisBatchRepo.resetFailed(analysisId);

  // Reset analysis counters for the retry
  await analysisRepo.updateById(analysisId, {
    failed_batches: 0,
    completed_photos: 0,
    total_photos: 0,
    error: null,
  });

  const quality = TIER_LIMITS[ctx.user.tier].imageQuality as ImageQuality;
  const size: ImageSize = "auto";

  // Enqueue with retry flag
  await enqueueAnalysis(
    analysisId,
    analysis.property_id,
    ctx.userId,
    quality,
    size,
    true
  );

  return {
    data: { id: analysisId, status: "analyzing" },
    events: [],
    availableActions: [
      {
        label: "Stream Progress",
        command: "StreamAnalysis",
        params: { analysisId },
      },
    ],
  };
}
```

**Step 2: Add export to `commands/index.ts`**

Add this line to `packages/api/src/commands/index.ts`:

```typescript
export { retryAnalysisBatches, type RetryAnalysisBatchesInput } from "./retry-analysis-batches.js";
```

**Step 3: Verify compilation**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors (or a `PlatformError.conflict` type error — see note below)

> **Note:** If `PlatformError.conflict` doesn't exist, use `new PlatformError("CONFLICT", 409, "...")` or check `packages/shared/src/types/` for the actual PlatformError constructor signature. Adapt accordingly.

**Step 4: Commit**

```bash
git add packages/api/src/commands/retry-analysis-batches.ts packages/api/src/commands/index.ts
git commit -m "feat: add RetryAnalysisBatches command"
```

---

### Task 5: Add API route and update available actions

**Files:**
- Modify: `packages/api/src/routes/analyses.ts`
- Modify: `packages/api/src/actions/analysis-actions.ts`

**Step 1: Add `POST /analyses/:id/retry` route**

In `packages/api/src/routes/analyses.ts`, add the import for `retryAnalysisBatches` at line 12:

```typescript
import {
  submitAnalysis,
  editAnalysisFields,
  archiveAnalysis,
  retryAnalysisBatches,
} from "../commands/index.js";
```

Then add this route before the `export default router` line:

```typescript
// POST /analyses/:id/retry - Retry failed batches
router.post("/analyses/:id/retry", async (req, res, next) => {
  try {
    const result = await retryAnalysisBatches(
      { analysisId: req.params.id },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});
```

**Step 2: Update `computeAnalysisActions` for retry**

Replace the `analysis-actions.ts` content in `packages/api/src/actions/analysis-actions.ts`:

```typescript
/**
 * @module analysis-actions
 * @capability Pure function that computes available actions for an analysis
 * @layer Orchestration
 *
 * Examines analysis status to determine which actions are available.
 * Terminal states (completed/failed) offer different action sets.
 */

import type { DbAnalysis, AvailableAction } from "@str-renovator/shared";

export function computeAnalysisActions(analysis: DbAnalysis): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (analysis.status === "completed" || analysis.status === "partially_completed") {
    actions.push({
      label: "View Action Plan",
      command: "view-action-plan",
      params: { analysisId: analysis.id, propertyId: analysis.property_id },
      variant: "primary",
      icon: "Compass",
    });

    actions.push({
      label: "Edit Assessment",
      command: "edit-assessment",
      params: { analysisId: analysis.id },
      variant: "secondary",
      icon: "Pencil",
    });

    actions.push({
      label: "Archive",
      command: "archive-analysis",
      params: { analysisId: analysis.id },
      variant: "destructive",
      icon: "X",
      confirmation: "Remove this analysis from the list? The data will be preserved.",
    });
  }

  // Retry available for both partially_completed and failed
  if (analysis.status === "partially_completed" || analysis.status === "failed") {
    actions.push({
      label: "Retry Failed Batches",
      command: "retry-analysis",
      params: { analysisId: analysis.id },
      variant: analysis.status === "failed" ? "primary" : "secondary",
      icon: "RotateCcw",
    });
  }

  return actions;
}
```

**Step 3: Verify compilation**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/api/src/routes/analyses.ts packages/api/src/actions/analysis-actions.ts
git commit -m "feat: add retry route and update available actions for partial/failed analyses"
```

---

### Task 6: Update frontend to use retry endpoint

**Files:**
- Modify: `packages/web/src/api/analyses.ts`
- Modify: `packages/web/src/pages/AnalysisView.tsx`

**Step 1: Add `useRetryAnalysis` hook**

Add this hook to `packages/web/src/api/analyses.ts` after the `useCreateAnalysis` function:

```typescript
export function useRetryAnalysis(analysisId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiFetch<{ data: { id: string; status: string } }>(
        `/api/v1/analyses/${analysisId}/retry`,
        token!,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis", analysisId] });
    },
  });
}
```

**Step 2: Update `AnalysisView.tsx` to use retry endpoint**

In `packages/web/src/pages/AnalysisView.tsx`:

1. Add import for `useRetryAnalysis`:

```typescript
import { useAnalysis, useUpdateAnalysis, useArchiveAnalysis, useRetryAnalysis } from "../api/analyses";
```

Remove the `useCreateAnalysis` import (line 4).

2. Replace the `createAnalysis` hook (line 23) with:

```typescript
const retryAnalysis = useRetryAnalysis(id!);
```

3. Update the `handleAction` callback — change the `retry-analysis` case (lines 37-41):

```typescript
case "retry-analysis":
  retryAnalysis.mutate(undefined, {
    onSuccess: () => {
      // Stay on the same page — SSE stream will show progress
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
    },
  });
  break;
```

4. Add `useQueryClient` import and hook:

```typescript
import { useQueryClient } from "@tanstack/react-query";
```

Inside the component, add:

```typescript
const queryClient = useQueryClient();
```

5. Update the `useCallback` deps array to include `retryAnalysis` instead of `createAnalysis`:

```typescript
[analysis, archiveAnalysis, retryAnalysis, navigate, queryClient, id],
```

**Step 3: Verify compilation**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/web/src/api/analyses.ts packages/web/src/pages/AnalysisView.tsx
git commit -m "feat(web): use retry endpoint instead of creating new analysis on retry"
```

---

### Task 7: Register command in manifest

**Files:**
- Modify: `packages/shared/src/manifests/commands.ts`

**Step 1: Add `RetryAnalysisBatches` to the command manifest array**

Find the commands array in `packages/shared/src/manifests/commands.ts` and add this entry alongside the other analysis commands:

```typescript
{
  id: "RetryAnalysisBatches",
  description: "Retry only the failed batches of a partially completed or failed analysis, then re-run the full downstream pipeline.",
  httpMethod: "POST",
  route: "/api/v1/analyses/:id/retry",
  tierGated: false,
  triggersJob: true,
  emitsEvents: [],
  requiresOwnership: true,
},
```

**Step 2: Commit**

```bash
git add packages/shared/src/manifests/commands.ts
git commit -m "feat(shared): register RetryAnalysisBatches in command manifest"
```

---

### Task 8: Run E2E tests and verify

**Step 1: Run full e2e suite**

Run: `cd packages/e2e && npx playwright test 2>&1 | tail -10`
Expected: 43 passed, 0 failures

**Step 2: Manual smoke test**

Navigate to a `partially_completed` analysis in the browser. Verify:
1. "Retry Failed Batches" button appears in the action bar
2. Clicking it shows the progress indicator
3. The analysis re-processes and reaches a terminal state

**Step 3: Final commit if any fixes needed**
