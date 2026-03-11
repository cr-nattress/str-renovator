# Epic 12: Design System Foundation — Typography & Color

## Summary

Replace the stock shadcn/ui defaults (system fonts, neutral gray palette) with a committed typographic and color identity. This is the single highest-leverage UI change — typography alone accounts for ~60% of visual quality perception, and the color system sets the emotional tone for every subsequent design decision.

## Why

The FRONTEND_DESIGN_ANALYSIS (scored 5.5/10) identified the system font stack and default color palette as the two highest-impact, lowest-effort critical gaps. The frontend-design plugin explicitly states: "NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts)."

The current `index.css` uses `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` and the accent color resolves to the same HSL value as secondary — there is no color personality.

## Current State

### Typography (`index.css` L21-23)
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

### Color Palette (`index.css` CSS variables)
```css
--accent: 210 40% 96.1%;     /* same as --secondary */
--primary: 222.2 47.4% 11.2%; /* stock navy */
--background: 0 0% 100%;      /* white */
```

## Scope

### 1. Apply Typography — "Renovation Studio" (Editorial & Refined)

**DECIDED: Option A**

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
```

- **Display font:** DM Serif Display — for property names, section headers, renovation titles, h1-h2
- **Body font:** DM Sans — clean, modern, architectural feel for body text and UI chrome

### 2. Apply Color System — Warm Terracotta

**DECIDED: Direction A — Warm Terracotta (renovation-matched)**

```css
:root {
  --background: 30 20% 98%;
  --foreground: 20 15% 10%;
  --primary: 18 72% 45%;           /* Warm terracotta */
  --primary-foreground: 0 0% 98%;
  --accent: 42 90% 55%;            /* Amber gold */
  --accent-foreground: 20 15% 10%;
  --muted: 30 15% 93%;
  --sidebar-bg: 20 25% 12%;        /* Deep warm charcoal */
}
```

### 3. Update Tailwind Config

- Add font-family tokens for display and body fonts
- Map to CSS custom properties for consistent usage
- Extend color palette if needed for the chosen direction

### 4. Apply Font Classes Globally

| Element | Font | Tailwind Class |
|---------|------|---------------|
| h1, h2, property names | Display font | `font-display` |
| h3, h4, section labels | Display font (lighter weight) | `font-display font-normal` |
| Body text, UI chrome | Body font | Default (set on `body`) |
| Code, data values | Mono | `font-mono` (existing) |

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/index.css` | Replace font stack, update all CSS color variables |
| `packages/web/tailwind.config.js` | Add `fontFamily.display` and `fontFamily.body` tokens |
| `packages/web/index.html` | Add Google Fonts `<link>` tag for preloading |

## Acceptance Criteria

- [ ] Display font applied to all h1, h2 elements and property names
- [ ] Body font applied as default via `body` rule
- [ ] Color palette has distinct primary, accent, and background values (no duplicate tokens)
- [ ] Sidebar uses the chosen dark tone from the palette
- [ ] All existing shadcn/ui components render correctly with new palette
- [ ] Google Fonts loaded with `display=swap` for performance
- [ ] Font preload `<link>` in `index.html` head

## Dependencies

None — this is the foundation all other visual epics build on.

## Estimated Complexity

**Low** — CSS variable changes, one Tailwind config update, one font import. No component logic changes.

## Design Decisions — RESOLVED

- **Color direction:** A — Warm Terracotta (warm linen background, terracotta primary, amber gold accent, deep warm charcoal sidebar)
- **Typography:** A — DM Serif Display (headings) + DM Sans (body)

This epic is ready for implementation with no open decisions.
