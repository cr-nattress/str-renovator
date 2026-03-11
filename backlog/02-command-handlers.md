# Epic 02: Extract Command Handlers from Route Handlers

## Summary

Move business logic (tier checks, ownership validation, counter management, job dispatch) out of Express route handlers into dedicated command handler functions. Routes become thin dispatchers: parse input, call command, return response.

## Why

Currently, route handlers in `packages/api/src/routes/` contain 3 concerns mixed together:
1. HTTP parsing (params, body, auth)
2. Business rules (tier limits, ownership, validation, counters)
3. Side effects (DB writes, job enqueue, counter increments)

This makes the business logic untestable without HTTP, unreachable from CLI/MCP, and invisible to the capability registry.

## Current State

### Business Logic in Routes (specific examples)

**`analyses.ts:16-66` — POST /properties/:propertyId/analyses:**
```
1. checkTierLimit("analysesPerMonth") middleware
2. Ownership: propertyRepo.findByIdWithColumns(propertyId, userId, "id")
3. Tier check: req.tierLimit ?? TIER_LIMITS[user.tier].analysesPerMonth
4. Validation: photoCount > 0
5. Tier defaults: quality/size fallback
6. Side effects: analysisRepo.create() → enqueueAnalysis() → userRepo.updateById(analyses_this_month + 1)
```

**`renovations.ts:83-146` — POST /renovations/:id/rerun:**
```
1. checkTierLimit("rerunsPerPhoto") middleware
2. Ownership: renovationRepo.findByIdAndUser()
3. Rerun limit: count vs tier limit + 1
4. Feedback aggregation: collect all feedback for this photo
5. Side effects: renovationRepo.create(iteration + 1) → enqueueRenovation()
```

**`properties.ts:42-63` — POST /:**
```
1. checkTierLimit("properties") middleware
2. Count check: propertyRepo.countByUser(userId) vs limit
3. Side effects: propertyRepo.create()
```

All 6 route files follow this same pattern of interleaving HTTP + business + side effects.

## Scope

### 1. Create Command Handler Infrastructure

**File:** `packages/api/src/commands/execute.ts`

```typescript
interface CommandContext {
  userId: string;
  user: DbUser;
  tierLimit?: number;
}

type CommandHandler<TInput, TOutput> = (
  input: TInput,
  ctx: CommandContext
) => Promise<CommandResult<TOutput>>;

interface CommandResult<T> {
  data: T;
  events: DomainEvent[];
  availableActions: AvailableAction[];
}
```

### 2. Extract Each Command

Create one file per command in `packages/api/src/commands/`:

| File | Extracted From | Business Rules |
|------|---------------|----------------|
| `create-property.ts` | `routes/properties.ts:42-63` | Tier limit count check |
| `update-property.ts` | `routes/properties.ts:120-137` | Ownership check |
| `delete-property.ts` | `routes/properties.ts:140-148` | Ownership check |
| `upload-photos.ts` | `routes/photos.ts:28-85` | Tier limit count check, file validation |
| `update-photo-metadata.ts` | `routes/photos.ts:124-150` | Ownership check |
| `delete-photo.ts` | `routes/photos.ts:153-169` | Ownership check, storage cleanup |
| `submit-analysis.ts` | `routes/analyses.ts:16-66` | Tier limit, photo count validation, counter increment, job enqueue |
| `edit-analysis-fields.ts` | `routes/analyses.ts:249-272` | Ownership check, field validation |
| `archive-analysis.ts` | `routes/analyses.ts:275-291` | Ownership check |
| `submit-renovation-feedback.ts` | `routes/renovations.ts:73-99` | Ownership check |
| `rerun-renovation.ts` | `routes/renovations.ts:102-165` | Tier limit, rerun count, feedback aggregation, job enqueue |
| `scrape-property-listing.ts` | `routes/scrape.ts:15-50` | Tier feature flag, ownership, job enqueue |
| `research-property-location.ts` | `routes/scrape.ts:83-109` | Ownership, city/state validation |
| `create-journey-item.ts` | `routes/design-journey.ts:63-89` | Ownership check |
| `update-journey-item.ts` | `routes/design-journey.ts:133-150` | Ownership check |

### 3. Add `availableActions` to Command Results

Each command returns contextual next actions. Examples:

**`submit-analysis.ts` returns:**
```typescript
availableActions: [
  { label: "Stream Progress", command: "StreamAnalysis", params: { analysisId } },
  { label: "View Analysis", command: "GetAnalysis", params: { analysisId } },
]
```

**`create-property.ts` returns:**
```typescript
availableActions: [
  { label: "Upload Photos", command: "UploadPhotos", params: { propertyId } },
  { label: "Import from Listing URL", command: "ScrapePropertyListing", params: { propertyId } },
]
```

### 4. Slim Down Route Handlers

Each route becomes ~5 lines:

```typescript
router.post("/", checkTierLimit("properties"), async (req, res, next) => {
  try {
    const result = await createProperty(
      createPropertySchema.parse(req.body),
      { userId: req.dbUser!.id, user: req.dbUser!, tierLimit: req.tierLimit }
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
```

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/api/src/commands/execute.ts` | ~30 |
| `packages/api/src/commands/create-property.ts` | ~35 |
| `packages/api/src/commands/update-property.ts` | ~25 |
| `packages/api/src/commands/delete-property.ts` | ~20 |
| `packages/api/src/commands/upload-photos.ts` | ~45 |
| `packages/api/src/commands/update-photo-metadata.ts` | ~25 |
| `packages/api/src/commands/delete-photo.ts` | ~25 |
| `packages/api/src/commands/submit-analysis.ts` | ~50 |
| `packages/api/src/commands/edit-analysis-fields.ts` | ~30 |
| `packages/api/src/commands/archive-analysis.ts` | ~20 |
| `packages/api/src/commands/submit-renovation-feedback.ts` | ~30 |
| `packages/api/src/commands/rerun-renovation.ts` | ~55 |
| `packages/api/src/commands/scrape-property-listing.ts` | ~35 |
| `packages/api/src/commands/research-property-location.ts` | ~30 |
| `packages/api/src/commands/create-journey-item.ts` | ~30 |
| `packages/api/src/commands/update-journey-item.ts` | ~25 |
| `packages/api/src/commands/index.ts` | ~20 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routes/properties.ts` | Slim to thin dispatchers calling commands |
| `packages/api/src/routes/photos.ts` | Same |
| `packages/api/src/routes/analyses.ts` | Same |
| `packages/api/src/routes/renovations.ts` | Same |
| `packages/api/src/routes/scrape.ts` | Same |
| `packages/api/src/routes/design-journey.ts` | Same |
| `packages/shared/src/types/command-response.ts` | Add `AvailableAction` details if not complete |

## Acceptance Criteria

- [ ] All 15 commands extracted with dedicated handler functions
- [ ] Route handlers reduced to <10 lines each (parse → command → respond)
- [ ] Each command returns `availableActions` appropriate to the entity state
- [ ] Business rules are testable without HTTP (pure function + context)
- [ ] Existing E2E tests pass unchanged
- [ ] `tsc --noEmit` clean

## Dependencies

- Epic 01 (Capability Registry) — for `AvailableAction` and `DomainEvent` types

## Estimated Complexity

Medium — mechanical extraction with clear before/after for each route.
