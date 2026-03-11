# Epic 07: Confidence & Reasoning on All AI Outputs

## Summary

Add `confidence` and `reasoning` fields to all AI skill responses and surface them consistently across the entire frontend. Currently only `PropertyAssessment` and `PhotoAnalysisCard` show these — everything else renders AI output as opaque text.

## Why

The CLAUDE.md vision states: "Every AI decision has a 'Why?' affordance expanding the reasoning field" and "Confidence indicators driven by confidence field — opacity/color/iconography cues."

Users need to know how confident the AI is in its suggestions and why it made specific recommendations — especially for high-cost renovation decisions.

## Current State

### Where Confidence/Reasoning EXISTS

| Component | Has Confidence | Has Reasoning | Source |
|-----------|---------------|--------------|--------|
| `PropertyAssessment.tsx` | Yes (line 30) | Yes (line 49) | `analysis.confidence`, `analysis.reasoning` |
| `PhotoAnalysisCard.tsx` | Yes (line 52) | Yes (line 69) | Props from parent |

### Where Confidence/Reasoning is MISSING

| Component | What It Displays | Gap |
|-----------|-----------------|-----|
| `ActionPlanTable.tsx` | Action items (priority, cost, impact) | No "Why is this high priority?" |
| `PropertyProfileDisplay.tsx` | Synthesized property intelligence | No confidence on any section |
| `LocationProfileDisplay.tsx` | Market research data | No confidence on area analysis |
| `ReviewAnalysisDisplay.tsx` | Guest review themes | No confidence on sentiment |
| `ScrapedDataDisplay.tsx` | Extracted listing data | No confidence on extraction accuracy |
| `RenovationView.tsx` | Suggested renovations + report | No "Why these specific changes?" |

### Existing UI Components (ready to reuse)

- `ConfidenceIndicator.tsx` — colored badge showing 0.0-1.0 score
- `ReasoningExpander.tsx` — expandable "Why?" section with reasoning text

## Scope

### 1. Update AI Prompts to Request Confidence + Reasoning

**File:** `packages/shared/src/prompts/index.ts`

Add to each system prompt's JSON output instructions:

```
Include a "confidence" field (0.0 to 1.0) indicating how confident you are in this analysis.
Include a "reasoning" field explaining your key decision factors and what information you relied on.
```

**Prompts to update:**

| Prompt | Version Bump | Notes |
|--------|-------------|-------|
| `LISTING_EXTRACTION_SYSTEM_PROMPT` | v1 → v2 | Confidence in extraction accuracy |
| `LOCATION_RESEARCH_SYSTEM_PROMPT` | v1 → v2 | Confidence in market assessment |
| `REVIEW_ANALYSIS_SYSTEM_PROMPT` | v1 → v2 | Confidence in sentiment analysis |
| `PROPERTY_SYNTHESIS_SYSTEM_PROMPT` | v2 → v3 | Confidence in synthesis quality |
| `ANALYSIS_SYSTEM_PROMPT` | v4 → v5 | Already has per-photo, add overall |
| `REPORT_SYSTEM_PROMPT` | v1 → v2 | Confidence in recommendations |

### 2. Update Schemas to Include Fields

**File:** `packages/shared/src/schemas/ai-responses.ts`

Add to each schema:

```typescript
confidence: z.number().min(0).max(1).optional(),
reasoning: z.string().optional(),
```

Already using `.passthrough()` on most schemas, so these will flow through even before explicit schema changes — but adding them explicitly documents the contract.

### 3. Surface Confidence on Frontend Components

**Wrap existing display components with confidence/reasoning UI:**

| Component | Change |
|-----------|--------|
| `PropertyProfileDisplay.tsx` | Add `ConfidenceIndicator` in header + `ReasoningExpander` below |
| `LocationProfileDisplay.tsx` | Add `ConfidenceIndicator` in header + `ReasoningExpander` below |
| `ReviewAnalysisDisplay.tsx` | Add `ConfidenceIndicator` next to sentiment badge |
| `ScrapedDataDisplay.tsx` | Add `ConfidenceIndicator` in header |
| `ActionPlanTable.tsx` | Add per-row "Why?" tooltip or expander for each action item |
| `RenovationView.tsx` | Add `ReasoningExpander` below "Suggested Renovations" section |

### 4. Add Per-Action-Item Reasoning

The `ActionItem` type in `packages/shared/src/types/domain.ts` currently has:
```typescript
priority: number;
item: string;
estimated_cost: string;
impact: Priority;
rooms_affected: string[];
```

Add: `reasoning?: string;` — explains why this specific renovation is recommended and why at this priority/impact level.

Update `ANALYSIS_SYSTEM_PROMPT` to request reasoning per action item.

## Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/prompts/index.ts` | Add confidence/reasoning to 6 prompts, bump versions |
| `packages/shared/src/schemas/ai-responses.ts` | Add confidence/reasoning fields |
| `packages/shared/src/types/domain.ts` | Add reasoning to ActionItem |
| `packages/web/src/components/properties/PropertyProfileDisplay.tsx` | Add ConfidenceIndicator + ReasoningExpander |
| `packages/web/src/components/properties/LocationProfileDisplay.tsx` | Add ConfidenceIndicator + ReasoningExpander |
| `packages/web/src/components/properties/ReviewAnalysisDisplay.tsx` | Add ConfidenceIndicator |
| `packages/web/src/components/properties/ScrapedDataDisplay.tsx` | Add ConfidenceIndicator |
| `packages/web/src/components/analysis/ActionPlanTable.tsx` | Add per-row reasoning tooltip |
| `packages/web/src/pages/RenovationView.tsx` | Add ReasoningExpander |

## Acceptance Criteria

- [ ] All 6 AI prompts request confidence + reasoning fields
- [ ] Prompt versions bumped for all modified prompts
- [ ] All AI output schemas include optional confidence/reasoning
- [ ] `ConfidenceIndicator` appears on every AI-generated card/section
- [ ] `ReasoningExpander` ("Why?") appears on every substantive AI output
- [ ] Action items include per-item reasoning
- [ ] Existing data without confidence/reasoning renders gracefully (optional fields)
- [ ] New analyses produce data with confidence/reasoning populated

## Dependencies

None — can be done independently. But benefits from Epic 03 (skill modules) for cleaner organization.

## Estimated Complexity

Low-Medium — prompt updates are straightforward. Frontend changes reuse existing components.
