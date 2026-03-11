# Epic 08: Intent-Based Property Creation

## Summary

Replace the 10-field PropertyForm with an intent-based onboarding flow. Users paste a listing URL or describe a property in natural language. The platform extracts everything automatically. The traditional form remains as a fallback for power users.

## Why

The CLAUDE.md vision states: "Intent over forms. Replace multi-step forms with smart intent inputs backed by commands/planners. Multi-field forms are a last resort."

Currently, `PropertyForm.tsx` has 10 fields: name, description, listing_url, context, address_line1, address_line2, city, state, zip_code, country. Most users already have a listing URL — the system should extract all fields from that URL automatically.

The scrape flow already does this partially (listing URL → structured data). This epic makes it the primary path.

## Current State

### PropertyForm.tsx (lines 52-165)

Traditional React form with:
- 10 input fields rendered via `<Input>` and `<Textarea>`
- Required: `name` only
- Optional: everything else
- No autocomplete, no AI assistance, no URL detection
- Submit creates a property with whatever fields are filled

### Existing Scrape Pipeline

After property creation, users can:
1. Paste a URL in `UrlImportForm.tsx`
2. This triggers `POST /properties/:id/scrape` → `scrape.job.ts`
3. The scrape job extracts: title, description, address, bedrooms, bathrooms, amenities, etc.
4. Extracted data auto-populates empty property fields

**The scrape pipeline already does what the form asks users to do manually.**

## Scope

### 1. Create `PropertyIntentBox` Component

**File:** `packages/web/src/components/properties/PropertyIntentBox.tsx`

A single smart input that handles three modes:

**Mode 1: URL detected** — User pastes an Airbnb/VRBO URL
```
┌──────────────────────────────────────────────────┐
│  Paste a listing URL or describe your property   │
│  ┌──────────────────────────────────────────────┐ │
│  │ https://airbnb.com/rooms/12345              │ │
│  └──────────────────────────────────────────────┘ │
│  [Import from Listing →]                         │
│                                                  │
│  We'll extract the property name, address,       │
│  description, photos, and guest reviews           │
│  automatically.                                   │
└──────────────────────────────────────────────────┘
```

Flow: Creates property with auto-generated name → immediately triggers scrape → redirects to property detail with scrape progress visible.

**Mode 2: Natural text** — User describes the property
```
┌──────────────────────────────────────────────────┐
│  Paste a listing URL or describe your property   │
│  ┌──────────────────────────────────────────────┐ │
│  │ My 2BR cabin in Gatlinburg, TN. Built in    │ │
│  │ 1990, needs updating. Budget around $30k.   │ │
│  └──────────────────────────────────────────────┘ │
│  [Create Property →]                             │
│                                                  │
│  Extracted:                                      │
│  Name: "2BR Cabin"  City: Gatlinburg  State: TN │
│  Context: Built in 1990, needs updating, ~$30k  │
└──────────────────────────────────────────────────┘
```

Flow: Client-side detection of city/state/type from text → creates property with extracted fields → user can edit on detail page.

**Mode 3: Just a name** — Minimal path
```
┌──────────────────────────────────────────────────┐
│  Paste a listing URL or describe your property   │
│  ┌──────────────────────────────────────────────┐ │
│  │ Beach House                                  │ │
│  └──────────────────────────────────────────────┘ │
│  [Create Property →]                             │
│                                                  │
│  Or use the [detailed form] for full control.    │
└──────────────────────────────────────────────────┘
```

### 2. URL Detection Logic

Client-side URL pattern matching:

```typescript
const LISTING_URL_PATTERNS = [
  /airbnb\.(com|co\.\w+)\/rooms\//,
  /vrbo\.com\/\d+/,
  /booking\.com\/hotel\//,
  /https?:\/\/.+/,  // Generic URL fallback
];

function detectInputMode(text: string): "url" | "description" | "name" {
  if (LISTING_URL_PATTERNS.some(p => p.test(text.trim()))) return "url";
  if (text.length > 50 || text.includes(",")) return "description";
  return "name";
}
```

### 3. Auto-Create + Scrape Endpoint

**File:** `packages/api/src/commands/create-property-from-url.ts`

New command that combines property creation + scrape dispatch in one operation:

```typescript
// Input: { listingUrl: string }
// Steps:
// 1. Create property with name = domain-extracted placeholder
// 2. Create scrape job
// 3. Enqueue scrape
// 4. Return property + scrapeJobId
```

**Route:** `POST /properties/from-url` — single endpoint that creates + scrapes.

### 4. Update Dashboard to Use IntentBox

Replace current "Add Property" dialog (which shows PropertyForm) with dialog showing PropertyIntentBox. Add a "Use detailed form" link that reveals the traditional PropertyForm.

### 5. Smart Text Extraction (Optional Enhancement)

For "description" mode, a lightweight client-side parser extracts:
- Numbers + "BR"/"BD" → bedrooms
- City names (common US cities list) → city
- State abbreviations → state
- Dollar amounts → context budget
- Property types ("cabin", "condo", "house") → property type hint

No AI call needed — regex/pattern matching is sufficient for the common case.

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/web/src/components/properties/PropertyIntentBox.tsx` | ~120 |
| `packages/api/src/commands/create-property-from-url.ts` | ~40 |
| `packages/api/src/routes/properties.ts` (new route) | ~15 (added to existing file) |

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/pages/Dashboard.tsx` | Replace PropertyForm dialog with IntentBox dialog |
| `packages/web/src/components/properties/EditPropertyDialog.tsx` | Keep as-is for edit mode |
| `packages/web/src/api/properties.ts` | Add `useCreatePropertyFromUrl` mutation |

## Acceptance Criteria

- [ ] IntentBox detects URL vs. description vs. name input
- [ ] Pasting a listing URL creates property + triggers scrape in one step
- [ ] User is redirected to property detail with scrape progress visible
- [ ] Descriptive text extracts basic fields (city, state, type) client-side
- [ ] Traditional form accessible via "detailed form" link
- [ ] Existing edit flow unchanged (EditPropertyDialog still uses PropertyForm)

## Dependencies

- Epic 02 (Command Handlers) — for the `CreatePropertyFromUrl` command

## Estimated Complexity

Medium — new component + new endpoint. Client-side detection is straightforward. The scrape pipeline already exists.
