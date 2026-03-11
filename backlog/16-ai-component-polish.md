# Epic 16: AI Component UX Polish

## Summary

Improve the visual weight and discoverability of three existing AI transparency components: `ReasoningExpander`, `EditableText`, and `ConfidenceIndicator`. These components are functionally correct but visually underweight — users won't discover or trust features they can't see.

## Why

The design analysis identifies three related issues:
- **High #6:** ReasoningExpander's "Why?" button is `text-xs text-muted-foreground` (12px, muted gray) — invisible for a trust-critical feature
- **High #7:** EditableText's edit affordance is `hover:bg-muted/50` — users won't know AI content is editable
- **Medium #11:** ConfidenceIndicator's dot is static — high-confidence items should feel alive

For an AI product, showing reasoning and enabling editing are major trust signals. Burying them defeats the purpose.

## Current State

### ReasoningExpander (`ReasoningExpander.tsx` — 30 lines)
```tsx
// "Why?" button — barely visible
<button className="text-xs text-muted-foreground hover:text-foreground">
  Why?
</button>
```
- No icon, no border, no visual container
- Expand/collapse is instant (no animation)
- Expanded content in a plain `bg-muted/50` box

### EditableText (`EditableText.tsx` — 72 lines)
```tsx
// Read mode — no visual hint that content is editable
<p className="... hover:bg-muted/50 cursor-pointer">
  {value}
</p>
```
- Only visible affordance is a slight background on hover
- No "click to edit" label, no pencil icon, no AI-generated badge
- Save/Cancel buttons appear in edit mode (functional)

### ConfidenceIndicator (`ConfidenceIndicator.tsx` — 40 lines)
```tsx
// Static dot with opacity
<span className="w-1.5 h-1.5 rounded-full" style={{ opacity: confidence }} />
```
- Colored badge is good (green/yellow/red tiers)
- Dot indicator uses opacity correctly
- But high-confidence items are static — no "alive" feel

## Scope

### 1. ReasoningExpander — Increase Visual Weight

Replace the invisible "Why?" link with a bordered, animated expander:

```tsx
<div className="mt-3 border border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium
                     text-muted-foreground hover:text-foreground hover:bg-muted/50
                     transition-colors">
    <span className="text-[10px]">✦</span>
    {expanded ? "Hide AI reasoning" : "See why the AI recommended this"}
    <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
  </button>
  {/* Animated expand/collapse */}
</div>
```

Key changes:
- Dashed border container makes it visible at rest
- "✦" sparkle prefix signals AI context
- Copy changed from "Why?" to "See why the AI recommended this"
- Chevron icon for expand/collapse state
- Animated height transition (CSS or Framer Motion)

### 2. EditableText — Add Discoverability Cues

Add a persistent hover indicator and AI attribution:

```tsx
<div className="relative group">
  {/* Hover tooltip */}
  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
      click to edit
    </span>
  </div>
  {/* Content with stronger hover affordance */}
  <p className="... hover:bg-muted/40 hover:ring-1 hover:ring-border transition-all">
    {value}
  </p>
</div>
```

Key changes:
- "click to edit" tooltip appears on hover (hidden at rest to avoid clutter)
- Stronger hover state: ring border + background
- Optional: persistent "✦ AI-generated" badge above editable blocks

### 3. ConfidenceIndicator — Breathing Animation for High Confidence

Add `animate-ping` to the dot indicator for high-confidence (≥0.8) items:

```tsx
{confidence >= 0.8 && (
  <span className="relative flex h-1.5 w-1.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
  </span>
)}
```

This creates a subtle "pulse" effect that makes high-confidence indicators feel alive — matching the pattern used by notification dots across modern apps.

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/ai/ReasoningExpander.tsx` | Restyle — border container, sparkle icon, chevron, animated expand |
| `packages/web/src/components/ai/EditableText.tsx` | Add hover tooltip, stronger hover state, optional AI badge |
| `packages/web/src/components/ai/ConfidenceIndicator.tsx` | Add ping animation for high-confidence dot |

## Acceptance Criteria

- [ ] ReasoningExpander has a visible dashed border container at rest
- [ ] ReasoningExpander shows descriptive copy ("See why the AI recommended this")
- [ ] ReasoningExpander has chevron icon indicating expand/collapse state
- [ ] ReasoningExpander expand/collapse is animated (not instant)
- [ ] EditableText shows "click to edit" tooltip on hover
- [ ] EditableText has a ring border on hover (clear affordance)
- [ ] ConfidenceIndicator dot pulses for confidence ≥ 0.8
- [ ] All changes maintain existing functionality (save, edit, expand behavior unchanged)
- [ ] Components work correctly in all views where they're currently used

## Dependencies

- **Epic 12** (Design System) — uses committed palette for accent colors

## Estimated Complexity

**Low** — CSS/className changes to three existing components. No new props, no backend changes, no new dependencies.
