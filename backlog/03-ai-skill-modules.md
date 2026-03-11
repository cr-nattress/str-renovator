# Epic 03: Extract AI Services into Self-Contained Skill Modules

## Summary

Reorganize the 8 AI services from flat `services/` files into self-contained skill modules. Each skill becomes a directory with its service function, manifest metadata, and clear boundaries. The `executeJsonChatCompletion` helper becomes shared execution infrastructure.

## Why

Currently AI services are scattered:
- Prompts live in `packages/shared/src/prompts/index.ts` (497 lines, all in one file)
- Schemas live in `packages/shared/src/schemas/ai-responses.ts`
- Service functions live in `packages/api/src/services/`
- The connection between a prompt, its schema, and its service is implicit (import-based)

This makes it hard to: understand a skill's full contract at a glance, version skills independently, expose skills via MCP, or add new skills without touching multiple files.

## Current State

### Services That Already Conform to Skill Pattern (stateless, pure)

| Service | File | Pattern | Lines |
|---------|------|---------|-------|
| Listing Extraction | `listing-extraction.service.ts` | `executeJsonChatCompletion` | 23 |
| Location Research | `location-research.service.ts` | `executeJsonChatCompletion` | 29 |
| Review Analysis | `review-analysis.service.ts` | `executeJsonChatCompletion` | ~20 |
| Property Synthesis | `property-synthesis.service.ts` | `executeJsonChatCompletion` | 24 |
| Report Generation | `report.service.ts` | Direct OpenAI (text, not JSON) | ~35 |
| Image Edit | `renovation.service.ts` | DALL-E image edit API | ~80 |
| Property Analysis | `analysis.service.ts` | Direct OpenAI (vision, multimodal) | 89 |

### Service That Is Orchestration, Not a Skill

| Service | File | Why Not a Skill |
|---------|------|----------------|
| Batch Processing | `batch.service.ts` | Reads DB, downloads photos, manages batch state — orchestration layer |

The aggregation function inside `batch.service.ts` (`aggregateBatchResults`) does contain a pure AI call that could be extracted as a skill.

## Scope

### 1. Create Skill Module Directory Structure

```
packages/api/src/skills/
  analyze-property/
    index.ts              # Re-exports the skill function
    execute.ts            # The pure skill implementation (from analysis.service.ts)
    manifest.ts           # Skill metadata for registry
  extract-listing-data/
    index.ts
    execute.ts            # From listing-extraction.service.ts
    manifest.ts
  research-location/
    index.ts
    execute.ts            # From location-research.service.ts
    manifest.ts
  analyze-reviews/
    index.ts
    execute.ts            # From review-analysis.service.ts
    manifest.ts
  synthesize-property-profile/
    index.ts
    execute.ts            # From property-synthesis.service.ts
    manifest.ts
  generate-text-report/
    index.ts
    execute.ts            # From report.service.ts
    manifest.ts
  edit-image/
    index.ts
    execute.ts            # From renovation.service.ts
    manifest.ts
  aggregate-batch-analyses/
    index.ts
    execute.ts            # Extracted from batch.service.ts aggregation
    manifest.ts
```

### 2. Each Manifest Contains

```typescript
// packages/api/src/skills/analyze-property/manifest.ts
import { ANALYSIS_PROMPT_VERSION } from "@str-renovator/shared";

export const ANALYZE_PROPERTY_MANIFEST = {
  id: "analyze-property",
  name: "Property Analysis",
  description: "Analyze STR property listing photos for room-by-room renovation recommendations",
  promptVersion: ANALYSIS_PROMPT_VERSION,
  model: "gpt-4o",
  capabilities: ["vision"],
  maxTokens: 4096,
  tags: ["vision", "analysis", "str", "photos"],
} as const;
```

### 3. Move Service Logic to `execute.ts` Files

Each `execute.ts` is the pure skill function, moved from the current service file. The function signature stays the same — this is a file move, not a rewrite.

**Example: `extract-listing-data/execute.ts`:**
```typescript
// Moved from listing-extraction.service.ts — no logic changes
export async function extractListingData(
  pageContent: string,
  listingUrl: string
): Promise<AiResult<Record<string, unknown>>> {
  return executeJsonChatCompletion({
    systemPrompt: LISTING_EXTRACTION_SYSTEM_PROMPT,
    userMessage: buildListingExtractionPrompt(pageContent, listingUrl),
    schema: ListingDataSchema,
    promptVersion: LISTING_EXTRACTION_PROMPT_VERSION,
    temperature: 0.2,
    errorLabel: "listing extraction",
  });
}
```

### 4. Keep `llm.service.ts` as Shared Infrastructure

`executeJsonChatCompletion()` remains in `packages/api/src/services/llm.service.ts` — it's infrastructure, not a skill. All JSON-based skills import from it.

### 5. Update Imports Across Codebase

All consumers currently importing from `services/*.service.ts` need to import from `skills/*/index.ts` instead. Key consumers:

| Consumer | Current Import | New Import |
|----------|---------------|------------|
| `scrape.job.ts` | `listing-extraction.service` | `skills/extract-listing-data` |
| `scrape.job.ts` | `review-analysis.service` | `skills/analyze-reviews` |
| `scrape.job.ts` | `location-research.service` | `skills/research-location` |
| `scrape.job.ts` | `property-synthesis.service` | `skills/synthesize-property-profile` |
| `batch.service.ts` | `analysis.service` | `skills/analyze-property` |
| `steps/generate-reports.ts` | `report.service` | `skills/generate-text-report` |
| `renovate.job.ts` | `renovation.service` | `skills/edit-image` |
| `action-image.job.ts` | `renovation.service` | `skills/edit-image` |

### 6. Delete Empty Service Files

After migration, delete the now-empty service files:
- `listing-extraction.service.ts`
- `location-research.service.ts`
- `review-analysis.service.ts`
- `property-synthesis.service.ts`
- `report.service.ts`
- `renovation.service.ts`
- `analysis.service.ts`

Keep `batch.service.ts` (orchestration logic stays, but AI aggregation call moves to skill).

## Files to Create

| File | Lines (est.) |
|------|-------------|
| 8 skill directories, each with 3 files | ~40 per skill |
| Total new files: 24 | ~320 total |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/jobs/scrape.job.ts` | Update 4 imports |
| `packages/api/src/services/batch.service.ts` | Update 1 import, extract aggregation |
| `packages/api/src/jobs/steps/generate-reports.ts` | Update 1 import |
| `packages/api/src/jobs/renovate.job.ts` | Update 1 import |
| `packages/api/src/jobs/action-image.job.ts` | Update 1 import |

## Files to Delete

| File |
|------|
| `packages/api/src/services/listing-extraction.service.ts` |
| `packages/api/src/services/location-research.service.ts` |
| `packages/api/src/services/review-analysis.service.ts` |
| `packages/api/src/services/property-synthesis.service.ts` |
| `packages/api/src/services/report.service.ts` |
| `packages/api/src/services/renovation.service.ts` |
| `packages/api/src/services/analysis.service.ts` |

## Acceptance Criteria

- [ ] All 8 skills live in `packages/api/src/skills/` with manifest + execute + index
- [ ] Each skill's manifest matches the registry entry from Epic 01
- [ ] All consumers updated to import from `skills/` instead of `services/`
- [ ] Old service files deleted
- [ ] `batch.service.ts` retains orchestration, delegates AI call to skill
- [ ] All existing tests pass
- [ ] `tsc --noEmit` clean

## Dependencies

- Epic 01 (Capability Registry) — for manifest types

## Estimated Complexity

Medium — mostly file moves and import updates. The skill interface is already established by the existing `AiResult<T>` pattern.
