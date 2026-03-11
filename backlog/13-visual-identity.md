# Epic 13: Visual Identity & Branding

## Summary

Create a minimal but distinctive visual identity for STR Renovator — logomark, wordmark, favicon, and consistent brand application. Currently the product has no face: the sidebar shows "STR Renovator" in plain `text-lg font-bold` with zero visual distinction.

## Why

The design analysis identifies this as Critical Issue #1. A product without a visual identity feels unfinished regardless of technical quality. Users form trust judgments in milliseconds based on visual presentation. The current plain-text header signals "prototype" not "product."

## Current State

### Sidebar Header (`Sidebar.tsx` L8-11)
```tsx
<h1 className="text-lg font-bold tracking-tight">STR Renovator</h1>
<p className="text-xs text-gray-400">AI-Powered Renovation</p>
```

### Browser Tab
Default Vite favicon. No custom icon.

### Auth Screens
Clerk-managed auth pages have no product branding beyond what Clerk provides by default.

## Scope

### 1. Design Logomark

Create a minimal SVG logomark that communicates the product concept:
- House outline + sparkle/AI element
- OR before/after split icon (bisected house)
- OR renovation tool + sparkle combination

Requirements:
- Works at 16px (favicon), 32px (sidebar), and 64px+ (auth screens)
- Single-color version for dark and light backgrounds
- SVG format for scalability

### 2. Create Wordmark

Pair the logomark with the product name using the display typeface selected in Epic 12:
- "STR Renovator" or "STR" abbreviation with icon
- Tagline variant: "AI-Powered Renovation" in body font, muted

### 3. Apply Brand Elements

| Location | Element |
|----------|---------|
| Sidebar header | Logomark + wordmark (32px mark) |
| Browser tab | Favicon (16px mark) + product name in `<title>` |
| Auth screens (Clerk) | Logomark via Clerk appearance customization |
| Loading/splash state | Centered logomark with shimmer animation |

### 4. Create Brand Asset Files

```
packages/web/public/
  favicon.svg         # 16px logomark
  logo-mark.svg       # Standalone mark (32px+)
  logo-full.svg       # Mark + wordmark combination
  og-image.png        # Open Graph image for link sharing
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/layout/Sidebar.tsx` | Replace plain text with logomark + wordmark component |
| `packages/web/index.html` | Update favicon link, page title |
| `packages/web/public/` | Add logo SVG assets |
| Clerk dashboard | Upload logo for auth screen branding |

## Acceptance Criteria

- [ ] SVG logomark created, works at 16px/32px/64px
- [ ] Wordmark uses display typeface from Epic 12
- [ ] Sidebar shows logomark + wordmark (not plain text)
- [ ] Browser favicon is custom (not Vite default)
- [ ] Brand assets exist in `public/` directory
- [ ] Logo renders correctly on both sidebar dark background and light contexts

## Dependencies

- **Epic 12** (Design System Foundation) — needs the committed display typeface and color palette for the wordmark and mark colors

## Estimated Complexity

**Medium** — requires design asset creation (SVG work) plus integration into multiple touchpoints.
