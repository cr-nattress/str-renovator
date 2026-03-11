# Epic 11: Editable AI Output & Action History

## Summary

Make all AI-generated fields editable in-place and track edit history for undo/rollback. Currently only `property_assessment` and `style_direction` are editable — everything else is read-only.

## Why

The CLAUDE.md vision states:
- "Editable AI output — every AI-generated field is editable in-place on interaction"
- "Undo / rollback — every AI state mutation is reversible via platform action history"

Users need to correct AI mistakes, add nuance, and customize recommendations for their specific situation.

## Current State

### What IS Editable

| Field | Component | Mechanism |
|-------|-----------|-----------|
| `property_assessment` | `PropertyAssessment.tsx` | `EditableText` → `PATCH /analyses/:id` |
| `style_direction` | `PropertyAssessment.tsx` | `EditableText` → `PATCH /analyses/:id` |

### What is NOT Editable (but should be)

| Field | Component | Data Source |
|-------|-----------|-------------|
| Scraped listing data | `ScrapedDataDisplay.tsx` | `property.scraped_data` |
| Location profile sections | `LocationProfileDisplay.tsx` | `property.location_profile` |
| Property profile sections | `PropertyProfileDisplay.tsx` | `property.property_profile` |
| Review analysis sections | `ReviewAnalysisDisplay.tsx` | `property.review_analysis` |
| Action plan items | `ActionPlanTable.tsx` | `analysis.raw_json.action_plan` |
| Suggested renovations text | `RenovationView.tsx` | `analysisPhoto.renovations` |
| Journey item title/description | `ActionItemCard.tsx` | `journeyItem.title`, `.description` |

### EditableText Component (already built)

`packages/web/src/components/ai/EditableText.tsx`:
- Click to edit mode
- Save/cancel buttons
- Loading state during save
- Calls `onSave(newValue)` callback

## Scope

### 1. Add PATCH Endpoints for Missing Editable Fields

| Endpoint | Fields | DB Column |
|----------|--------|-----------|
| `PATCH /properties/:id` (exists) | `scraped_data`, `location_profile`, `property_profile`, `review_analysis` | JSONB columns |
| `PATCH /analysis-photos/:id` (new) | `room`, `strengths`, `renovations`, `priority` | Individual columns |
| `PATCH /journey/:id` (exists) | Add `title`, `description`, `estimated_cost`, `impact` | Individual columns |

Most PATCH endpoints already exist — just need to accept additional fields.

### 2. Wrap AI Output Sections with EditableText

For string fields, wrap with `EditableText`:
```tsx
<EditableText
  value={renovations}
  onSave={(newValue) => updateAnalysisPhoto({ renovations: newValue })}
/>
```

For JSONB sections (scraped_data, profiles), allow editing individual keys:
```tsx
// Each CollapsibleSection's content becomes editable
<EditableText
  value={data.property_summary}
  onSave={(newValue) => updateProperty({
    property_profile: { ...profile, property_summary: newValue }
  })}
/>
```

### 3. Add Edit History Table

**Migration:** `packages/api/src/db/008_edit_history.sql`

```sql
create table str_renovator.edit_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,        -- 'property', 'analysis', 'analysis_photo', 'journey_item'
  entity_id uuid not null,
  field_path text not null,         -- 'property_profile.property_summary', 'renovations'
  previous_value jsonb,
  new_value jsonb,
  edited_by uuid references str_renovator.users(id),
  source text not null default 'user',  -- 'user' | 'ai' | 'scrape'
  created_at timestamptz default now()
);

create index idx_edit_history_entity on str_renovator.edit_history(entity_type, entity_id);
```

### 4. Record Edits on PATCH

When a user edits an AI-generated field, record the change:

```typescript
// In update-property command
await editHistoryRepo.create({
  entity_type: "property",
  entity_id: propertyId,
  field_path: "property_profile.property_summary",
  previous_value: oldProfile.property_summary,
  new_value: newValue,
  edited_by: userId,
  source: "user",
});
```

### 5. Add Undo Endpoint

**Route:** `POST /edit-history/:id/undo`

Reverts the entity field to `previous_value` and creates a new edit history entry recording the undo.

### 6. Frontend Undo Toast

After any edit save, show a toast with "Undo" button (visible for 10 seconds):

```tsx
toast({
  title: "Field updated",
  action: <Button variant="outline" onClick={() => undoEdit(editId)}>Undo</Button>,
  duration: 10000,
});
```

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/api/src/db/008_edit_history.sql` | ~15 |
| `packages/api/src/repositories/edit-history.repository.ts` | ~40 |
| `packages/api/src/commands/undo-edit.ts` | ~30 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/properties/PropertyProfileDisplay.tsx` | Wrap sections with EditableText |
| `packages/web/src/components/properties/LocationProfileDisplay.tsx` | Wrap sections with EditableText |
| `packages/web/src/components/properties/ReviewAnalysisDisplay.tsx` | Wrap sections with EditableText |
| `packages/web/src/components/properties/ScrapedDataDisplay.tsx` | Wrap values with EditableText |
| `packages/web/src/components/analysis/ActionPlanTable.tsx` | Make items editable |
| `packages/web/src/pages/RenovationView.tsx` | Wrap renovations text with EditableText |
| `packages/web/src/components/design-journey/ActionItemCard.tsx` | Make title/description editable |
| `packages/api/src/routes/design-journey.ts` | Accept title, description, impact in PATCH |
| `packages/api/src/commands/*.ts` | Record edit history on updates |
| `packages/shared/src/types/database.ts` | Add `DbEditHistory` type |

## Acceptance Criteria

- [ ] All AI-generated text fields are editable in-place
- [ ] Edit history recorded in DB for every AI field change
- [ ] Undo button appears in toast after edits (10s window)
- [ ] Undo reverts to previous value
- [ ] Edit history entries include source (user vs. ai vs. scrape)
- [ ] Original AI output is always recoverable via history

## Dependencies

- Epic 02 (Command Handlers) — edit recording is cleanest in command handlers

## Estimated Complexity

Medium-High — many components to update, new DB table, edit tracking logic.
