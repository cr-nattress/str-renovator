# Phase 2 Implementation Plan — Structured Costs + Full-Room Renovation Images

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add numeric cost fields to action items/journey items (BL-010) and generate composite full-room renovation images (BL-003).

**Architecture:** BL-010 extends the existing ActionItem schema with `cost_min`/`cost_max` numbers, threads them through the pipeline into a new DB migration, and replaces regex cost parsing with direct numeric aggregation. BL-003 adds a new `generate-full-renovation` skill and pipeline step that creates one composite DALL-E image per analysis photo after individual action images complete.

**Tech Stack:** TypeScript, Zod, Supabase (Postgres migrations), BullMQ, OpenAI DALL-E, React, TanStack Query

---

## Task 1: Add cost_min/cost_max to ActionItem schema and types

**Files:**
- Modify: `packages/shared/src/schemas/ai-responses.ts:15-23`
- Modify: `packages/shared/src/types/domain.ts:17-25`
- Modify: `packages/shared/src/types/dto.ts:62-69`

**Step 1: Update ActionItemSchema**

In `packages/shared/src/schemas/ai-responses.ts`, add `cost_min` and `cost_max` to `ActionItemSchema`:

```typescript
export const ActionItemSchema = z.object({
  priority: z.number(),
  item: z.string(),
  estimated_cost: z.string(),
  cost_min: z.number().optional(),
  cost_max: z.number().optional(),
  impact: z.enum(["high", "medium", "low"]),
  rooms_affected: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});
```

**Step 2: Update ActionItem type**

In `packages/shared/src/types/domain.ts`, add to the `ActionItem` interface:

```typescript
export interface ActionItem {
  priority: number;
  item: string;
  estimated_cost: string;
  cost_min?: number;
  cost_max?: number;
  impact: Priority;
  rooms_affected: string[];
  confidence?: number;
  reasoning?: string;
}
```

**Step 3: Update CreateJourneyItemDto**

In `packages/shared/src/types/dto.ts`, add to `CreateJourneyItemDto`:

```typescript
export interface CreateJourneyItemDto {
  priority: number;
  title: string;
  description?: string;
  estimated_cost?: string;
  cost_min?: number;
  cost_max?: number;
  impact: Priority;
  rooms_affected: string[];
}
```

**Step 4: Update DbDesignJourneyItem**

In `packages/shared/src/types/database.ts`, add to `DbDesignJourneyItem` (after `estimated_cost`):

```typescript
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
```

**Step 5: Build shared and verify**

Run: `npm run build:shared`
Expected: No errors

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add cost_min/cost_max to ActionItem schema and types"
```

---

## Task 2: DB migration for structured cost columns

**Files:**
- Create: `supabase/migrations/<next>_add_structured_costs.sql`

**Step 1: Create migration**

Run: `supabase migration new add_structured_costs`

**Step 2: Write the migration SQL**

In the generated file:

```sql
-- Add structured cost fields to design_journey_items
ALTER TABLE str_renovator.design_journey_items
  ADD COLUMN estimated_cost_min numeric(10,2),
  ADD COLUMN estimated_cost_max numeric(10,2);

-- Backfill from existing string values where possible
-- Pattern: "$100-200" or "$1,500" or "$100 - $200"
UPDATE str_renovator.design_journey_items
SET
  estimated_cost_min = CASE
    WHEN estimated_cost ~ '[\d,]+' THEN
      CAST(REPLACE((regexp_matches(estimated_cost, '[\d,]+'))[1], ',', '') AS numeric)
    ELSE NULL
  END,
  estimated_cost_max = CASE
    WHEN estimated_cost ~ '[\d,]+.*[\d,]+' THEN
      CAST(REPLACE((regexp_matches(estimated_cost, '[\d,]+.*?([\d,]+)'))[1], ',', '') AS numeric)
    WHEN estimated_cost ~ '[\d,]+' THEN
      CAST(REPLACE((regexp_matches(estimated_cost, '[\d,]+'))[1], ',', '') AS numeric)
    ELSE NULL
  END
WHERE estimated_cost IS NOT NULL;
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "migration: add estimated_cost_min/max columns to design_journey_items"
```

---

## Task 3: Update analysis prompt to output cost_min/cost_max

**Files:**
- Modify: `packages/shared/src/prompts/index.ts:3` (version bump)
- Modify: `packages/shared/src/prompts/index.ts:192-201` (action plan example)

**Step 1: Bump prompt version**

Change line 3 from `"v5"` to `"v6"`:
```typescript
export const ANALYSIS_PROMPT_VERSION = "v6";
```

**Step 2: Update the action plan example in the prompt**

Find the `action_plan` example and add `cost_min`/`cost_max`:

```typescript
action_plan: [
  {
    priority: 1,
    item: "Description of the action item",
    estimated_cost: "$500-1,200",
    cost_min: 500,
    cost_max: 1200,
    impact: "high",
    rooms_affected: ["Living Room"],
    reasoning: "Why this action item was recommended and its expected ROI...",
  },
],
```

Also add instruction text near the action plan instructions:
> For each action item, include `cost_min` and `cost_max` as numeric values (no currency symbols). If a single cost, set both to the same value. `estimated_cost` remains as a human-readable string.

**Step 3: Build shared and verify**

Run: `npm run build:shared`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/shared/src/prompts/
git commit -m "feat(shared): update analysis prompt to output structured cost fields (v6)"
```

---

## Task 4: Thread cost_min/cost_max through journey item creation pipeline

**Files:**
- Modify: `packages/api/src/jobs/steps/create-journey-items.ts:90-101`
- Modify: `packages/api/src/repositories/design-journey.repository.ts:16-33` (create) and `35-82` (upsert)

**Step 1: Update create-journey-items.ts**

In the upsert call, add `cost_min` and `cost_max` from the action item:

```typescript
await designJourneyRepo.upsertByTitle({
  // ...existing fields...
  estimated_cost: action.estimated_cost,
  cost_min: action.cost_min ?? null,
  cost_max: action.cost_max ?? null,
  // ...rest of fields...
});
```

**Step 2: Update design-journey.repository.ts**

In the `create` and `upsertByTitle` methods, include `estimated_cost_min` and `estimated_cost_max` in the insert/update SQL:

For `create()` — add to the insert columns and values:
```typescript
estimated_cost_min: input.cost_min ?? null,
estimated_cost_max: input.cost_max ?? null,
```

For `upsertByTitle()` — add to the update-on-conflict columns.

**Step 3: Run tests**

Run: `npx vitest run --dir packages/api`
Expected: All existing tests pass (no new tests yet for this — tested via E2E)

**Step 4: Commit**

```bash
git add packages/api/src/jobs/steps/create-journey-items.ts packages/api/src/repositories/design-journey.repository.ts
git commit -m "feat(api): thread cost_min/cost_max through journey item pipeline"
```

---

## Task 5: Update journey summary aggregation to use numeric fields

**Files:**
- Modify: `packages/api/src/routes/design-journey.ts:140-154`

**Step 1: Replace regex parsing with numeric aggregation**

Replace the cost parsing block with:

```typescript
let totalEstimated = 0;
for (const item of allItems) {
  if (item.estimated_cost_min != null && item.estimated_cost_max != null) {
    totalEstimated += (item.estimated_cost_min + item.estimated_cost_max) / 2;
  } else if (item.estimated_cost) {
    // Fallback: parse string for pre-v6 data
    const numbers = item.estimated_cost.match(/[\d,]+/g);
    if (numbers && numbers.length >= 2) {
      const low = parseInt(numbers[0].replace(/,/g, ""), 10);
      const high = parseInt(numbers[1].replace(/,/g, ""), 10);
      totalEstimated += (low + high) / 2;
    } else if (numbers && numbers.length === 1) {
      totalEstimated += parseInt(numbers[0].replace(/,/g, ""), 10);
    }
  }
}
```

**Step 2: Run tests**

Run: `npx vitest run --dir packages/api`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/api/src/routes/design-journey.ts
git commit -m "feat(api): use numeric cost fields for journey summary aggregation"
```

---

## Task 6: Update frontend to display cost range from numeric fields

**Files:**
- Modify: `packages/web/src/components/design-journey/ActionItemCard.tsx:129-133`

**Step 1: Update estimated cost display**

Replace the estimated cost display with:

```typescript
<div className="space-y-1">
  <Label className="text-xs">Est. Cost</Label>
  <p className="text-sm text-muted-foreground py-1.5">
    {item.estimated_cost_min != null && item.estimated_cost_max != null
      ? item.estimated_cost_min === item.estimated_cost_max
        ? `$${item.estimated_cost_min.toLocaleString()}`
        : `$${item.estimated_cost_min.toLocaleString()} – $${item.estimated_cost_max.toLocaleString()}`
      : item.estimated_cost || "N/A"}
  </p>
</div>
```

**Step 2: Type-check**

Run: `npx tsc --noEmit -p packages/web/tsconfig.app.json`
Expected: No new errors

**Step 3: Commit**

```bash
git add packages/web/src/components/design-journey/ActionItemCard.tsx
git commit -m "feat(web): display structured cost range on journey items"
```

---

## Task 7: DB migration for full_renovation columns on analysis_photos

**Files:**
- Create: `supabase/migrations/<next>_add_full_renovation_fields.sql`

**Step 1: Create migration**

Run: `supabase migration new add_full_renovation_fields`

**Step 2: Write migration SQL**

```sql
-- Add full-renovation composite image fields to analysis_photos
ALTER TABLE str_renovator.analysis_photos
  ADD COLUMN full_renovation_storage_path text,
  ADD COLUMN full_renovation_status text NOT NULL DEFAULT 'pending';
```

**Step 3: Update DbAnalysisPhoto type**

In `packages/shared/src/types/database.ts`, add to `DbAnalysisPhoto`:

```typescript
  full_renovation_storage_path: string | null;
  full_renovation_status: string;
```

**Step 4: Build shared**

Run: `npm run build:shared`
Expected: No errors

**Step 5: Commit**

```bash
git add supabase/migrations/ packages/shared/src/types/database.ts
git commit -m "migration: add full_renovation fields to analysis_photos"
```

---

## Task 8: Create generate-full-renovation skill

**Files:**
- Create: `packages/api/src/skills/generate-full-renovation/manifest.ts`
- Create: `packages/api/src/skills/generate-full-renovation/execute.ts`
- Create: `packages/api/src/skills/generate-full-renovation/index.ts`
- Modify: `packages/shared/src/prompts/index.ts` (add new prompt builder + version constant)

**Step 1: Add prompt constant and builder to shared prompts**

In `packages/shared/src/prompts/index.ts`, add:

```typescript
export const FULL_RENOVATION_PROMPT_VERSION = "v1";

export function buildFullRenovationPrompt(
  room: string,
  actionDescriptions: string[],
  styleDirection: string,
): string {
  const combined = actionDescriptions
    .map((d, i) => `${i + 1}. ${d}`)
    .join("\n");
  return `Apply ALL of the following renovation changes to this ${room} photo simultaneously. ` +
    `Style direction: ${styleDirection}. ` +
    `Make every change visible in a single cohesive result:\n${combined}\n` +
    `The result should look like a professionally renovated room with all improvements applied together, not individual edits stacked on top of each other.`;
}
```

Build shared: `npm run build:shared`

**Step 2: Create manifest.ts**

```typescript
import type { SkillManifest } from "../types.js";
import { FULL_RENOVATION_PROMPT_VERSION } from "@str-renovator/shared";

export const GENERATE_FULL_RENOVATION_MANIFEST: SkillManifest = {
  id: "generate-full-renovation",
  name: "Generate Full Renovation Image",
  description: "Creates a composite image showing all recommended renovations applied to a room photo at once.",
  promptVersion: FULL_RENOVATION_PROMPT_VERSION,
  model: "dall-e-2",
  inputDescription: "Original room photo (PNG) + list of all action item descriptions for that room.",
  outputDescription: "Single renovated photo (PNG) with all changes applied together.",
  tags: ["visual", "image-editing", "renovation", "composite"],
} as const;
```

**Step 3: Create execute.ts**

```typescript
import sharp from "sharp";
import { openAiConnector } from "../../connectors/openai.connector.js";
import { buildFullRenovationPrompt, FULL_RENOVATION_PROMPT_VERSION } from "@str-renovator/shared";
import { logger } from "../../config/logger.js";
import type { AiResult } from "@str-renovator/shared";

export async function generateFullRenovation(
  photoBuffer: Buffer,
  room: string,
  actionDescriptions: string[],
  styleDirection: string,
  quality: string,
  size: string,
): Promise<AiResult<Buffer>> {
  const prompt = buildFullRenovationPrompt(room, actionDescriptions, styleDirection);

  logger.info(
    { room, actionCount: actionDescriptions.length, promptLength: prompt.length },
    "generating full renovation composite image",
  );

  const pngBuffer = await sharp(photoBuffer)
    .ensureAlpha()
    .png()
    .toBuffer();

  const response = await openAiConnector.imageEdit({
    image: pngBuffer,
    filename: "room.png",
    prompt,
    model: "dall-e-2",
    size: size || "1024x1024",
    responseFormat: "b64_json",
  });

  const resultBuffer = Buffer.from(response.b64Json!, "base64");

  return {
    data: resultBuffer,
    metadata: {
      model: "dall-e-2",
      tokensUsed: 0,
      promptVersion: FULL_RENOVATION_PROMPT_VERSION,
    },
  };
}
```

**Step 4: Create index.ts**

```typescript
export { GENERATE_FULL_RENOVATION_MANIFEST } from "./manifest.js";
export { generateFullRenovation } from "./execute.js";
```

**Step 5: Commit**

```bash
git add packages/shared/src/prompts/ packages/api/src/skills/generate-full-renovation/
git commit -m "feat: add generate-full-renovation skill and prompt"
```

---

## Task 9: Add repository method and pipeline step for full renovation

**Files:**
- Modify: `packages/api/src/repositories/analysis-photo.repository.ts`
- Create: `packages/api/src/jobs/steps/generate-full-renovations.ts`
- Modify: `packages/api/src/jobs/analyze.job.ts:74-81` (add new step)

**Step 1: Add repository method**

In `analysis-photo.repository.ts`, add:

```typescript
async updateFullRenovation(
  id: string,
  storagePath: string | null,
  status: string,
): Promise<void> {
  const { error } = await this.supabase
    .from("analysis_photos")
    .update({
      full_renovation_storage_path: storagePath,
      full_renovation_status: status,
    })
    .eq("id", id);

  if (error) throw error;
}
```

**Step 2: Create pipeline step**

Create `packages/api/src/jobs/steps/generate-full-renovations.ts`:

```typescript
import { logger } from "../../config/logger.js";
import { generateFullRenovation } from "../../skills/generate-full-renovation/index.js";
import { analysisPhotoRepository } from "../../repositories/analysis-photo.repository.js";
import { designJourneyRepository } from "../../repositories/design-journey.repository.js";
import { photoRepository } from "../../repositories/photo.repository.js";
import { storageService } from "../../services/storage.service.js";
import type { DbAnalysisPhoto } from "@str-renovator/shared";

export async function generateFullRenovations(
  analysisPhotos: DbAnalysisPhoto[],
  propertyId: string,
  userId: string,
  styleDirection: string,
  quality: string,
  size: string,
): Promise<void> {
  for (const ap of analysisPhotos) {
    try {
      await analysisPhotoRepository.updateFullRenovation(ap.id, null, "processing");

      // Get all action items for this room
      const journeyItems = await designJourneyRepository.listByProperty(propertyId, userId);
      const roomItems = journeyItems.filter((ji) =>
        ji.rooms_affected.some((r) => r.toLowerCase() === ap.room.toLowerCase()),
      );

      if (roomItems.length === 0) {
        logger.info({ analysisPhotoId: ap.id, room: ap.room }, "no action items for room, skipping full renovation");
        await analysisPhotoRepository.updateFullRenovation(ap.id, null, "skipped");
        continue;
      }

      // Download original photo
      const photo = await photoRepository.findById(ap.photo_id);
      if (!photo) {
        logger.warn({ photoId: ap.photo_id }, "photo not found, skipping full renovation");
        await analysisPhotoRepository.updateFullRenovation(ap.id, null, "failed");
        continue;
      }

      const photoBuffer = await storageService.download(photo.storage_path);

      const actionDescriptions = roomItems.map((ji) => ji.title + (ji.description ? `: ${ji.description}` : ""));

      const result = await generateFullRenovation(
        photoBuffer,
        ap.room,
        actionDescriptions,
        styleDirection,
        quality,
        size,
      );

      // Upload result
      const storagePath = `full-renovations/${propertyId}/${ap.id}.png`;
      await storageService.upload(storagePath, result.data, "image/png");

      await analysisPhotoRepository.updateFullRenovation(ap.id, storagePath, "completed");

      logger.info(
        { analysisPhotoId: ap.id, room: ap.room, actionCount: actionDescriptions.length },
        "full renovation image generated",
      );
    } catch (err) {
      logger.error({ err, analysisPhotoId: ap.id }, "failed to generate full renovation image");
      await analysisPhotoRepository.updateFullRenovation(ap.id, null, "failed");
    }
  }
}
```

**Step 3: Wire into pipeline**

In `packages/api/src/jobs/analyze.job.ts`, add the new step after `enqueue-renovations` (after line 74) and before `generate-reports` (line 78):

```typescript
// Step 6b: Generate full renovation composite images
await generateFullRenovations(
  analysisPhotos,
  job.data.propertyId,
  job.data.userId,
  aggregated.style_direction,
  job.data.quality ?? "standard",
  job.data.size ?? "1024x1024",
);
```

Add the import at the top of the file.

**Step 4: Run tests**

Run: `npx vitest run --dir packages/api`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/api/src/repositories/analysis-photo.repository.ts packages/api/src/jobs/steps/generate-full-renovations.ts packages/api/src/jobs/analyze.job.ts
git commit -m "feat(api): add full renovation pipeline step and repository method"
```

---

## Task 10: Surface full renovation images in the frontend

**Files:**
- Modify: `packages/web/src/pages/RenovationView.tsx`
- Modify: `packages/web/src/api/journey.ts` (or analysis API — wherever analysis photos are fetched)

**Step 1: Update analysis photo API response**

Ensure the API returns `full_renovation_storage_path` and `full_renovation_status` from analysis photos. If there's a signed-URL generation step for photos, add the full renovation path to it.

**Step 2: Update RenovationView**

Add the full-renovation composite image as the primary before/after comparison when available. Move individual action item images below as secondary:

```typescript
{/* Primary: Full renovation composite */}
{analysisPhoto?.full_renovation_url && (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-3">Full Renovation</h3>
    <PhotoCompare
      beforeSrc={data.photo.url ?? ""}
      afterSrc={analysisPhoto.full_renovation_url}
    />
  </div>
)}

{/* Secondary: Individual action images */}
{latestRenovation?.url && (
  <div>
    <h3 className="text-sm font-medium text-muted-foreground mb-3">Individual Changes</h3>
    <PhotoCompare
      beforeSrc={data.photo.url ?? ""}
      afterSrc={latestRenovation.url}
    />
  </div>
)}
```

Add a loading state when `full_renovation_status === "processing"`.

**Step 3: Type-check**

Run: `npx tsc --noEmit -p packages/web/tsconfig.app.json`
Expected: No new errors from our changes

**Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): display full renovation composite image as primary before/after"
```

---

## Task 11: Build, verify, and final commit

**Step 1: Build shared**

Run: `npm run build:shared`
Expected: Clean build

**Step 2: Type-check web**

Run: `npx tsc --noEmit -p packages/web/tsconfig.app.json`
Expected: No new errors from our changes

**Step 3: Run API tests**

Run: `npx vitest run --dir packages/api`
Expected: All existing tests pass

**Step 4: Verify dev server starts**

Run: `npm run dev` (background)
Check that both API (3001) and web (5173) start without errors.
