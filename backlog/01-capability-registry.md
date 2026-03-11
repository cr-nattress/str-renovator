# Epic 01: Capability Registry & Skill Manifests

## Summary

Create a central registry of all platform capabilities — AI skills, commands, emitted events, and connectors. This is the foundation for agent self-discovery, auto-generated docs, MCP server tooling, and the `availableActions` pattern that drives AI-native UX.

## Why This First

Every other epic depends on capabilities being formally declared. Without a registry, commands don't know what actions to suggest, the MCP server can't advertise tools, and the frontend can't render platform-driven CTAs.

## Current State

- No `packages/shared/src/manifests/` directory exists
- `SkillResponse<T>` and `CommandResponse<T>` types exist in `packages/shared/src/types/` but are never used by actual API responses
- AI services return raw `AiResult<T>` — no `contentType`, `confidence`, or `reasoning` fields
- 8 AI skills exist as services but have no formal metadata
- 15 state-mutating routes exist but aren't formalized as commands
- Domain events are defined only as SSE types in `packages/shared/src/types/events.ts`

## Scope

### 1. Create Skill Manifest Type + Registry

**File:** `packages/shared/src/manifests/skills.ts`

Define a `SkillManifest` type and register all 8 existing AI skills:

```typescript
interface SkillManifest {
  id: string;                    // kebab-case: "analyze-property"
  name: string;                  // Human-readable: "Property Analysis"
  description: string;           // What it does
  promptVersion: string;         // Current version constant
  model: string;                 // "gpt-4o" | "dall-e-2"
  inputDescription: string;      // What it accepts
  outputDescription: string;     // What it returns
  temperature?: number;
  maxTokens?: number;
  tags: string[];                // ["vision", "analysis", "str"]
}
```

**Skills to register:**

| Skill ID | Service File | Prompt Version |
|----------|-------------|----------------|
| `analyze-property` | `analysis.service.ts` | v4 |
| `extract-listing-data` | `listing-extraction.service.ts` | v1 |
| `research-location` | `location-research.service.ts` | v1 |
| `analyze-reviews` | `review-analysis.service.ts` | v1 |
| `synthesize-property-profile` | `property-synthesis.service.ts` | v2 |
| `generate-text-report` | `report.service.ts` | v1 |
| `edit-image` | `renovation.service.ts` | v1 |
| `aggregate-batch-analyses` | `batch.service.ts` (aggregation portion) | v1 |

### 2. Create Command Manifest Type + Registry

**File:** `packages/shared/src/manifests/commands.ts`

Define a `CommandManifest` type and register all 15 state-mutating operations:

```typescript
interface CommandManifest {
  id: string;                    // PascalCase: "SubmitAnalysis"
  description: string;
  tierGated?: string;            // Which tier limit key gates this command
  triggersJob?: string;          // Which BullMQ queue it enqueues to
  emitsEvents: string[];         // Domain events produced
  requiresOwnership: boolean;    // Whether it checks entity ownership
}
```

**Commands to register:**

| Command | Route | Tier-Gated | Triggers Job |
|---------|-------|-----------|-------------|
| `CreateProperty` | `POST /properties` | `properties` | — |
| `UpdateProperty` | `PATCH /properties/:id` | — | — |
| `DeleteProperty` | `DELETE /properties/:id` | — | — |
| `UploadPhotos` | `POST /properties/:id/photos` | `photosPerProperty` | — |
| `UpdatePhotoMetadata` | `PATCH /photos/:id` | — | — |
| `DeletePhoto` | `DELETE /photos/:id` | — | — |
| `SubmitAnalysis` | `POST /properties/:id/analyses` | `analysesPerMonth` | `analysis` |
| `EditAnalysisFields` | `PATCH /analyses/:id` | — | — |
| `ArchiveAnalysis` | `PATCH /analyses/:id/archive` | — | — |
| `SubmitRenovationFeedback` | `POST /renovations/:id/feedback` | — | — |
| `RerunRenovation` | `POST /renovations/:id/rerun` | `rerunsPerPhoto` | `renovation` |
| `ScrapePropertyListing` | `POST /properties/:id/scrape` | `urlScraping` | `scrape` |
| `ResearchPropertyLocation` | `POST /properties/:id/research-location` | — | `location-research` |
| `CreateJourneyItem` | `POST /properties/:id/journey` | — | — |
| `UpdateJourneyItem` | `PATCH /journey/:id` | — | — |

### 3. Create Domain Event Registry

**File:** `packages/shared/src/manifests/events.ts`

Define all domain events that should be explicitly emitted (currently implicit):

```typescript
interface DomainEventManifest {
  type: string;                  // "PropertyCreated"
  entityType: string;            // "property"
  description: string;
  dataShape: string;             // Reference to type
}
```

**Events to register:**
- `PropertyCreated`, `PropertyUpdated`, `PropertyDeleted`
- `PhotoUploaded`, `PhotoDeleted`
- `AnalysisSubmitted`, `AnalysisCompleted`, `AnalysisFailed`
- `RenovationCompleted`, `RenovationFailed`
- `FeedbackSubmitted`
- `ListingScraped`, `LocationResearched`, `ProfileSynthesized`
- `JourneyItemCreated`, `JourneyItemUpdated`

### 4. Create Shared Index Export

**File:** `packages/shared/src/manifests/index.ts`

Re-export all manifests. Update `packages/shared/src/index.ts` to include manifests.

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/shared/src/manifests/skills.ts` | ~120 |
| `packages/shared/src/manifests/commands.ts` | ~100 |
| `packages/shared/src/manifests/events.ts` | ~80 |
| `packages/shared/src/manifests/index.ts` | ~5 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Add manifests export |

## Acceptance Criteria

- [ ] All 8 skills are registered with accurate metadata
- [ ] All 15 commands are registered with tier/job/event metadata
- [ ] All domain events are declared with entity types
- [ ] Manifests are importable from `@str-renovator/shared`
- [ ] Types compile cleanly with `tsc --noEmit`

## Dependencies

None — this is the foundation epic.

## Estimated Complexity

Low — declarative metadata, no runtime changes.
