# Phase 2 Design — Structured Costs + Full-Room Renovation Images

## BL-010: Structured Cost Fields

### Problem
`estimated_cost` is a free-text string from GPT-4o (e.g., "$500–$1,200"). The BudgetTracker aggregates costs by regex-parsing these strings — fragile, lossy, and blocks proper sorting/filtering.

### Design
Add `cost_min` and `cost_max` numeric fields alongside the existing string. The string stays for display; aggregation uses the numbers. Existing analyses with string-only data degrade gracefully — aggregation falls back to regex parsing when numeric fields are null.

**Schema changes:**
- `ActionItemSchema`: add `cost_min: z.number().optional()`, `cost_max: z.number().optional()`
- `ActionItem` type: add `cost_min?: number`, `cost_max?: number`
- `CreateJourneyItemDto`: add `cost_min?: number`, `cost_max?: number`
- DB migration (`supabase migration new`): add `estimated_cost_min numeric(10,2)` and `estimated_cost_max numeric(10,2)` to `design_journey_items`

**Prompt changes:**
- Update analysis prompt example to request `cost_min` and `cost_max` as separate numeric fields
- Bump `ANALYSIS_PROMPT_VERSION` to `"v6"`

**Pipeline changes:**
- `create-journey-items.ts`: map `cost_min`/`cost_max` from AI response to new DB columns
- Journey summary endpoint: sum `estimated_cost_min` and `estimated_cost_max` directly; fall back to string parsing if null

**Frontend changes:**
- Display range as "$500 – $1,200" from numeric fields when available
- BudgetTracker already receives pre-aggregated numbers — no change needed

---

## BL-003: Full-Room Renovation Images

### Problem
Each renovation image shows a single action item applied to a room. There is no composite image showing ALL recommended changes applied together — which is the main "see the transformation" value proposition.

### Design
New skill + pipeline step that generates one composite image per `analysis_photo` after all individual action item images complete. Runs eagerly as part of the analysis pipeline.

**New skill: `generate-full-renovation/`**
- Input: original photo buffer + combined description of all action items for that room
- Output: single DALL-E edited image showing all renovations
- Uses same `openAiConnector.imageEdit()` as existing `edit-image` skill
- Stateless execution unit (per architecture rules)

**New prompt:**
- `buildFullRenovationPrompt(actionDescriptions: string[]): string` — combines all action item descriptions into one coherent DALL-E instruction
- `FULL_RENOVATION_PROMPT_VERSION = "v1"`

**DB migration (`supabase migration new`):**
- Add `full_renovation_storage_path text` to `analysis_photos` table
- Add `full_renovation_status text default 'pending'` to `analysis_photos` (pending | processing | completed | failed)

**Pipeline integration:**
- New step `generate-full-renovations.ts` runs after `enqueue-renovations` step
- For each `analysis_photo`: gather all action items for that room, download original photo, call skill, upload result to Supabase Storage, update `full_renovation_storage_path`
- Enqueues one BullMQ job per `analysis_photo` (rate-limited via existing `imageGenerationLimiter`)

**Repository changes:**
- `analysis-photo.repository.ts`: add `updateFullRenovation(id, storagePath, status)` method

**Frontend changes:**
- `RenovationView.tsx`: show full-renovation image as the PRIMARY before/after comparison
- Individual action item images move to a secondary "Individual Changes" section below
- Add loading state when `full_renovation_status === "processing"`

### Sequencing
BL-010 first (smaller, no dependencies), then BL-003. Both share an `ANALYSIS_PROMPT_VERSION` bump — BL-010 bumps to v6, BL-003 stays on v6 since it's a separate prompt.
