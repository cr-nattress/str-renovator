# Epic 06: Platform-Driven Actions & AI-Native Frontend

## Summary

Make the frontend a pure consumer of platform-provided actions. Currently, the frontend hardcodes which buttons to show. After this epic, the platform returns `availableActions` with every response, and the frontend renders whatever the platform suggests.

## Why

The CLAUDE.md vision states: "AI-generated CTAs. Available actions come from `CommandResponse.availableActions` — the frontend never decides what actions are available."

Currently, every page hardcodes its action buttons:
- Dashboard: "Add Property" button always visible
- PropertyDetail: "Run Analysis", "Import from URL", "Research Location" buttons hardcoded
- AnalysisView: "Archive" button hardcoded
- RenovationView: "Re-run Renovation" button hardcoded

The platform knows the entity state — it should tell the frontend what's possible.

## Current State

### Hardcoded Actions by Page

**Dashboard.tsx:**
- "Add Property" button — always shown
- No "you've hit your tier limit" awareness

**PropertyDetail.tsx (lines 74-75, 130-155):**
- "Run Analysis" — always shown if property loaded
- "Import from Listing URL" form — always shown
- "Research Location" — always shown
- No state awareness: shows "Run Analysis" even if no photos uploaded

**AnalysisView.tsx:**
- "Archive" button — always shown
- No contextual suggestions ("Re-run with different context", "Export report")

**RenovationView.tsx (lines 104-128):**
- "Re-run with Feedback" — always shown
- No awareness of rerun limit remaining
- No suggestions for what to change

**DesignJourney.tsx:**
- "Add Item" — always shown
- No platform-suggested groupings or prioritization

## Scope

### 1. Enrich GET Endpoints with `availableActions`

Modify read endpoints to compute and return available actions based on entity state:

**GET /properties/:id — Returns:**
```typescript
{
  ...property,
  availableActions: [
    // Only if photos exist:
    { label: "Run Analysis", command: "SubmitAnalysis", params: { propertyId } },
    // Only if listing_url set and not recently scraped:
    { label: "Import Listing Data", command: "ScrapePropertyListing", params: { propertyId } },
    // Only if city or state populated:
    { label: "Research Location", command: "ResearchPropertyLocation", params: { propertyId } },
    // Always:
    { label: "Upload Photos", command: "UploadPhotos", params: { propertyId } },
    { label: "Edit Property", command: "UpdateProperty", params: { propertyId } },
    // If under limit:
    { label: "Delete Property", command: "DeleteProperty", params: { propertyId }, confirmation: "Are you sure?" },
  ]
}
```

**GET /analyses/:id — Returns:**
```typescript
{
  ...analysis,
  availableActions: [
    // If completed:
    { label: "View Action Plan", command: "Navigate", params: { path: `/properties/${propertyId}/journey` } },
    { label: "Archive", command: "ArchiveAnalysis", params: { analysisId }, confirmation: "Archive this analysis?" },
    // If has editable fields:
    { label: "Edit Assessment", command: "EditAnalysisFields", params: { analysisId } },
  ]
}
```

**GET /analysis-photos/:id/renovations — Returns:**
```typescript
{
  ...renovationData,
  availableActions: [
    // If under rerun limit:
    { label: "Re-run Renovation", command: "RerunRenovation", params: { renovationId: latestId } },
    // If no feedback on latest:
    { label: "Rate This Result", command: "SubmitRenovationFeedback", params: { renovationId: latestId } },
  ]
}
```

### 2. Build `ActionBar` Frontend Component

**File:** `packages/web/src/components/ui/action-bar.tsx`

Generic component that renders `AvailableAction[]` as buttons/chips:

```tsx
interface ActionBarProps {
  actions: AvailableAction[];
  onAction: (action: AvailableAction) => void;
  layout?: "horizontal" | "floating";
}
```

- Primary actions render as buttons
- Secondary actions render as chips or dropdown
- Actions with `confirmation` show a dialog before executing
- Maps `command` to the appropriate mutation hook

### 3. Build `ActionChips` Component for Floating Suggestions

**File:** `packages/web/src/components/ui/action-chips.tsx`

For contextual follow-up actions that appear after operations complete:

```tsx
interface ActionChipsProps {
  actions: AvailableAction[];
  onAction: (action: AvailableAction) => void;
  dismissible?: boolean;
}
```

### 4. Update Each Page to Use Platform Actions

| Page | Change |
|------|--------|
| `Dashboard.tsx` | Replace hardcoded "Add Property" with action from properties list response |
| `PropertyDetail.tsx` | Replace all hardcoded buttons with `<ActionBar actions={property.availableActions} />` |
| `AnalysisView.tsx` | Replace archive button with `<ActionBar actions={analysis.availableActions} />` |
| `RenovationView.tsx` | Replace rerun section with `<ActionBar actions={data.availableActions} />` |
| `DesignJourney.tsx` | Add action bar from journey list response |

### 5. Add `AvailableAction` Type to Shared Package

**File:** Update `packages/shared/src/types/command-response.ts`

```typescript
export interface AvailableAction {
  label: string;
  command: string;
  params?: Record<string, unknown>;
  confirmation?: string;
  variant?: "primary" | "secondary" | "destructive";
  icon?: string;
  disabled?: boolean;
  disabledReason?: string;
}
```

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/web/src/components/ui/action-bar.tsx` | ~60 |
| `packages/web/src/components/ui/action-chips.tsx` | ~45 |
| `packages/api/src/actions/property-actions.ts` | ~40 (computes actions for property state) |
| `packages/api/src/actions/analysis-actions.ts` | ~35 |
| `packages/api/src/actions/renovation-actions.ts` | ~30 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routes/properties.ts` | GET /:id includes availableActions |
| `packages/api/src/routes/analyses.ts` | GET /:id includes availableActions |
| `packages/api/src/routes/renovations.ts` | GET includes availableActions |
| `packages/web/src/pages/Dashboard.tsx` | Use ActionBar instead of hardcoded button |
| `packages/web/src/pages/PropertyDetail.tsx` | Use ActionBar |
| `packages/web/src/pages/AnalysisView.tsx` | Use ActionBar |
| `packages/web/src/pages/RenovationView.tsx` | Use ActionBar |
| `packages/web/src/pages/DesignJourney.tsx` | Use ActionBar |
| `packages/shared/src/types/command-response.ts` | Ensure AvailableAction type complete |

## Acceptance Criteria

- [ ] All GET endpoints for entities return `availableActions` based on state
- [ ] Actions are context-aware (e.g., no "Run Analysis" if zero photos)
- [ ] Actions respect tier limits (e.g., disabled with reason if at limit)
- [ ] `ActionBar` component renders actions from API response
- [ ] No hardcoded action buttons remain on any page
- [ ] Actions with confirmation show dialog before executing
- [ ] Destructive actions use red variant styling

## Dependencies

- Epic 02 (Command Handlers) — commands define what actions exist
- Epic 01 (Capability Registry) — provides the `AvailableAction` type definition

## Estimated Complexity

Medium — requires both backend (action computation per entity state) and frontend (generic action renderer) changes.
