# STR Renovator — Product Backlog

> Gap analysis between ASSESSMENT.md (product vision) and current implementation.
> Items ordered by business impact within each category. Each item is self-contained
> and can be implemented independently.

---

## Legend

- **Size:** S (< 1 day), M (1–3 days), L (3–5 days), XL (1+ week)
- **Priority:** P0 (critical gap), P1 (high value), P2 (nice to have), P3 (future)
- **Status:** `open` | `in-progress` | `done`

---

## Category 1: Tier Limits Alignment

The assessment describes different tier limits than what's currently in code.

### BL-001: Align tier limits with product spec
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** `pro: 5 properties / 20 photos`, `business: 25 properties / 50 photos`
**Assessment says:** `pro: 10 properties / 50 photos`, `business: Unlimited properties / 200 photos`

**Work:**
- Update `TIER_LIMITS` in `packages/shared/src/constants/index.ts`
- Update `Tier` type if "unlimited" needs special handling (e.g., `Infinity` or skip check)
- Update pricing page copy in `packages/web/src/pages/Pricing.tsx`
- Verify tier middleware handles "unlimited" correctly

**Decision needed:** Which numbers are canonical — the assessment or the current code?

---

## Category 2: Image Generation Quality

### BL-002: Differentiate image quality between Standard and Premium tiers
**Priority:** P1 | **Size:** M | **Status:** open

**Current state:** `imageQuality` is `"low"` or `"high"` — maps to DALL-E quality param.
**Assessment says:** Free/Pro get "Standard", Business gets "Premium."

**Work:**
- Verify `imageQuality` values map to meaningful DALL-E parameters (size, quality, model)
- Consider whether "Premium" should use a newer model (e.g., DALL-E 3 or gpt-image-1)
- Update pricing page to show Standard/Premium distinction
- Add image quality indicator in RenovationView so users see what tier produced the image

---

## Category 3: Full-Room Renovation Images

### BL-003: Generate composite full-renovation images per room
**Priority:** P1 | **Size:** L | **Status:** open

**Current state:** Each renovation image shows a single action item applied to a room. There is no image showing ALL recommended changes applied together.
**Assessment says:** "Full Renovation Images — Shows all recommended changes for a room applied at once."

**Work:**
- New skill: `generate-full-renovation` — takes original photo + all renovation descriptions for that room, generates single composite image
- Trigger after all individual action images complete for a room
- New DB field on `analysis_photos`: `full_renovation_storage_path`
- Update RenovationView to show full-renovation image as primary before/after, with individual action images below
- Consider: generate on-demand vs. eagerly after analysis

**Dependencies:** None — existing image generation infrastructure handles this.

---

## Category 4: Re-Analysis Workflow

### BL-004: Post-renovation re-analysis with before/after comparison
**Priority:** P1 | **Size:** L | **Status:** open

**Current state:** Users can run a new analysis any time, but there's no concept of comparing a "before" analysis to an "after" analysis on the same property.
**Assessment says (step 11):** "Re-analyze — Upload new photos after renovations to measure improvement."

**Work:**
- Add `previous_analysis_id` FK on `analyses` table to link re-analyses
- When starting a re-analysis, show prompt: "Is this a re-analysis after renovations?"
- If yes, link to previous analysis and auto-carry over room names/constraints
- New comparison view: side-by-side analysis results (old assessment vs. new)
- Highlight improvements: "Kitchen went from 'needs work' to 'strong'"
- Track journey item completion based on re-analysis results

---

## Category 5: Design Journey Enhancements

### BL-005: Cost breakdown by materials and labor
**Priority:** P2 | **Size:** M | **Status:** open

**Current state:** Each journey item has a single `estimated_cost` string from AI.
**Assessment says:** "Coming soon: cost breakdowns by materials and labor."

**Work:**
- New skill: `estimate-renovation-cost` — takes action item description + room context, returns structured cost estimate
- Schema: `{ materials: LineItem[], labor: LineItem[], total: number }`
- Store as JSONB on `design_journey_items.cost_breakdown`
- New UI component: CostBreakdownTable in JourneyItemDetail
- Generate on-demand when user opens item detail (lazy, not at analysis time)

### BL-006: Shopping links for materials
**Priority:** P3 | **Size:** M | **Status:** open

**Current state:** Not implemented.
**Assessment says:** "Curated shopping links."

**Work:**
- New skill: `find-shopping-links` — given material description, returns product links
- Consider affiliate programs (Amazon Associates, Home Depot, etc.)
- UI: shopping links section in JourneyItemDetail
- Legal: disclose affiliate relationships if applicable

### BL-007: DIY tutorial video links
**Priority:** P3 | **Size:** S | **Status:** open

**Current state:** Not implemented.
**Assessment says:** "DIY tutorial videos."

**Work:**
- New skill: `find-tutorial-videos` — given renovation description, search YouTube/web for relevant tutorials
- UI: video embed or link list in JourneyItemDetail
- Consider: YouTube Data API for search, or just AI-generated search queries

### BL-008: Local service provider recommendations
**Priority:** P3 | **Size:** M | **Status:** open

**Current state:** Not implemented.
**Assessment says:** "Local service provider recommendations."

**Work:**
- Requires location context (property address/city)
- Integration options: Google Places API, Yelp Fusion API, or AI-generated suggestions
- UI: provider list in JourneyItemDetail with ratings and contact info
- Privacy: don't store provider data long-term, fetch fresh

---

## Category 6: Subscription & Billing

### BL-009: Upgrade/purchase flow for subscription tiers
**Priority:** P1 | **Size:** L | **Status:** open

**Current state:** Pricing page is read-only. No purchase flow. Tiers are assigned in DB but no way for users to change tier.
**Assessment implies:** Users can "upgrade for more" when hitting limits.

**Work:**
- Integrate Stripe (or similar) for subscription billing
- Pricing page: add "Subscribe" / "Upgrade" CTAs per tier
- Webhook handler: update user tier in DB on successful payment
- Downgrade handling: what happens to excess properties/photos?
- Trial period logic if desired

---

## Category 7: Analysis UX Improvements

### BL-010: Estimated cost field as structured number, not free-text string
**Priority:** P2 | **Size:** M | **Status:** open

**Current state:** `estimated_cost` is a string from AI (e.g., "$2,000" or "$500–$1,500"). The BudgetTracker needs to parse these to aggregate.
**Assessment implies:** Budget tracking works with real numbers.

**Work:**
- Update PropertyAnalysisSchema to include `estimated_cost_min` and `estimated_cost_max` as numbers
- Update analysis prompt to request structured cost ranges
- Migrate existing string costs to numeric fields (AI extraction or regex)
- BudgetTracker: sum numeric fields instead of parsing strings
- Keep display string for user-facing display

### BL-011: Confidence indicators on analysis results
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** ConfidenceIndicator component exists. Confidence is returned in raw_json. Need to verify it's consistently displayed.
**Assessment says:** "Confidence Score — How certain the AI is about each recommendation."

**Work:**
- Audit: verify confidence is shown on every photo card and action plan item
- Add confidence to journey items (carry from analysis)
- Visual: opacity/color/icon scale based on confidence value
- Sort/filter by confidence in action plan view

### BL-012: "Why?" reasoning expansion on every AI output
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** ReasoningExpander component exists. Reasoning is in raw_json.
**Assessment says:** "Every AI decision has a 'Why?' affordance expanding the reasoning field."

**Work:**
- Audit: verify reasoning is shown on property assessment, each photo card, each action plan item
- Add reasoning to journey items
- Ensure consistent "Why?" button/link pattern across all AI-generated content

---

## Category 8: Listing Intelligence Enhancements

### BL-013: Review analysis — memorable quotes extraction
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** Review analysis extracts themes, strengths, concerns, and opportunities.
**Assessment says:** Also extracts "Memorable Quotes — specific language from reviews."

**Work:**
- Update `analyze-reviews` skill prompt to extract 3–5 notable direct quotes
- Add `memorable_quotes: string[]` to review analysis schema
- Display in ReviewAnalysisDisplay component as blockquotes

### BL-014: Location research — suggested color palette
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** Location research generates area type, neighborhood character, guest profile, etc.
**Assessment says:** Also generates "Suggested color palette inspired by the local environment."

**Work:**
- Update `research-location` skill prompt to include color palette suggestion
- Add `suggested_palette: { name: string, hex: string }[]` to location schema
- Display as color swatches in LocationProfileDisplay
- Feed palette into analysis/renovation prompts for style coherence

---

## Category 9: Photo Management

### BL-015: Batch photo import from listing URL (additional photos)
**Priority:** P2 | **Size:** M | **Status:** open

**Current state:** URL import happens at property creation time. Can upload photos manually afterward.
**Assessment says:** "Import additional ones from a listing URL at any time."

**Work:**
- New route: `POST /properties/:id/import-photos` — accepts a listing URL
- Scrape only photos from the URL (skip full listing extraction)
- Deduplicate against existing photos (by filename or image hash)
- UI: "Import more photos" button on PropertyDetail photo tab

---

## Category 10: UX Polish

### BL-016: Empty states with AI-generated suggestions
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** Basic empty states exist.
**Assessment (CLAUDE.md):** "Empty states always include AI-generated suggestions."

**Work:**
- Dashboard empty state: suggest adding first property with example URLs
- PropertyDetail empty photos: suggest what rooms to photograph first
- Analysis empty state: suggest running first analysis with tips
- Journey empty state: suggest running an analysis to generate items

### BL-017: Error states with recovery actions
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** PlatformError includes `recovery` actions but frontend may not render them consistently.
**Assessment (CLAUDE.md):** "Frontend always renders message + at least one recovery action."

**Work:**
- Audit all error boundaries and API error handlers in frontend
- Ensure every error toast/banner renders `recovery` actions from PlatformError
- Add "Try again" button for retryable errors
- Add "Contact support" for unrecoverable errors

---

## Category 11: Amenity Intelligence

### BL-018: Amenity audit — detect present/missing amenities from photos and listing data
**Priority:** P1 | **Size:** L | **Status:** open

**Current state:** Photo analysis identifies rooms and recommends renovations but doesn't audit amenity presence against a standard checklist. The comprehensive amenity reference at `docs/plans/amenities.md` (292 items across 12 categories with status codes: ESSENTIAL, STANDARD, REQUIRED, RECOMMENDED, PREMIUM, OPERATIONAL) is not used anywhere in the codebase.

**Work:**

1. **Inject amenity context into analysis prompt** — Feed relevant amenity checklist sections into the GPT-4o system prompt based on detected rooms. When analyzing a kitchen photo, include Section 3 (Kitchen & Dining); for a bedroom, include Section 1; etc. The AI can then identify what's present, what's missing, and what matters most.

2. **New AI response field: `amenity_audit`** — Extend `PhotoAnalysisSchema` with:
   ```typescript
   amenity_audit: {
     detected: { item: string; status: string; tag: string }[];     // amenities visible in photo
     missing_essential: { item: string; why: string; cost_est: string }[];  // ESSENTIAL/REQUIRED items not visible
     recommended_additions: { item: string; status: string; impact: string; cost_est: string }[];  // high-ROI additions
   }
   ```

3. **Location-aware filtering** — Use property location/type tags (#mountain, #beach, #coastal, #urban) from the amenity reference to surface location-specific recommendations. A mountain cabin gets fireplace and boot dryer suggestions; a beach condo gets outdoor shower and pool towel suggestions.

4. **Amenity score per room** — Calculate completeness percentage (detected vs. expected for that room type) as a simple metric: "Kitchen: 72% amenity coverage (18/25 standard items detected)."

5. **Surface in UI** — New `AmenityAuditCard` component on the analysis view showing:
   - Detected amenities (green checks)
   - Missing essentials (red flags with cost estimates)
   - Recommended additions sorted by ROI (#cheap-win items first, then #booking-driver, then #rate-premium)

6. **Feed into design journey** — Missing ESSENTIAL and high-ROI RECOMMENDED items auto-generate `DesignJourneyItem` records tagged with amenity category, so hosts can track amenity improvements alongside renovations.

**Dependencies:** None — uses existing photo analysis pipeline. The amenity reference is static data injected into prompts.

**Key decision:** How much of the 292-item list to inject per prompt call? Recommend: only the sections matching detected rooms (typically 2-3 sections, ~1500 tokens) to stay within context limits.

---

## Implementation Priority Order

For maximum incremental value, implement in this order:

| Phase | Items | Theme |
|-------|-------|-------|
| **Phase 1** | BL-001, BL-011, BL-012 | Quick fixes — align tiers, verify AI transparency features |
| **Phase 2** | BL-003, BL-010 | Core experience — full-renovation images, structured costs |
| **Phase 3** | BL-004, BL-009 | Growth features — re-analysis workflow, billing |
| **Phase 4** | BL-018 | Intelligence — amenity audit from photos using 292-item reference |
| **Phase 5** | BL-002, BL-005, BL-013, BL-014, BL-015 | Polish — quality tiers, cost breakdowns, intelligence gaps |
| **Phase 6** | BL-006, BL-007, BL-008, BL-016, BL-017 | Nice-to-haves — shopping links, tutorials, providers, UX polish |
