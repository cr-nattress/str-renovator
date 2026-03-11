# Epic 15: PhotoCompare Hero Experience

## Summary

Transform the before/after photo comparison from a functional slider into the product's hero moment. The AI renovation reveal should feel visceral — a dramatic before → after transformation that showcases the product's core value. Currently it's a utilitarian side-by-side div.

## Why

The design analysis identifies PhotoCompare as High Priority Issue #4: "Before/after renovation comparison is the product's single most powerful moment. The reveal of 'your room, renovated by AI' should be visceral."

This is the feature that makes users say "wow." If it feels like a utility widget instead of a reveal, the product's most compelling differentiator is wasted.

## Current State

### PhotoCompare Component (`PhotoCompare.tsx` — 102 lines)

The current implementation is **functional** — it has:
- Drag-based slider with mouse/touch support
- Before/after labels in top corners
- Download buttons for both images
- Aspect-video container

What it **lacks**:
- Entry animation (instant render, no reveal)
- Visual drama (no glow, no contrast, no badge)
- Mobile-optimized gestures
- "AI Renovated" attribution
- Premium styling (rounded corners with shadow, handle design)

## Scope

### 1. Animated Reveal on Load

When the component mounts, animate the reveal:
1. Before image fades in (200ms)
2. Slider sweeps from 0% to 50% (400ms, ease-out)
3. After image is revealed as slider moves

This creates a "curtain opening" effect that draws attention to the transformation.

### 2. Premium Slider Handle

Replace the basic divider with a polished handle:
- Circular grab handle centered on the divider line
- Handle has shadow, white background, left/right arrow icon
- Subtle glow effect on the divider line using the accent color
- Cursor changes to `col-resize` on hover

### 3. "AI Renovated" Badge

Overlay a badge on the after image:
```
✦ AI Renovated
```
- Positioned top-right of the after side
- `bg-black/60 backdrop-blur-sm` glass effect
- Small, non-intrusive but visible

### 4. Container Styling

- Rounded corners with shadow: `rounded-xl shadow-lg overflow-hidden`
- Optional: subtle border using accent color at low opacity
- Dark background behind images for contrast when images load

### 5. Mobile Optimization

- Touch events already supported (verify smooth on mobile)
- Consider swipe gesture hint on first visit (animated hand icon)
- Stack mode option for very narrow viewports (before on top, after below, with swipe)

### 6. Add Framer Motion (if not already installed)

The component needs Framer Motion for the entry animation. Check if already in `package.json`; if not, install it.

```tsx
import { motion, useMotionValue, useTransform } from "framer-motion";
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/photos/PhotoCompare.tsx` | Major restyle — entry animation, handle, badge, container |
| `packages/web/package.json` | Add `framer-motion` if not present |

## Acceptance Criteria

- [ ] Component animates on mount — slider sweeps to reveal after image
- [ ] Slider handle is a polished circular element with arrow icon
- [ ] "✦ AI Renovated" badge visible on the after image
- [ ] Container has rounded corners, shadow, premium feel
- [ ] Drag interaction remains smooth on desktop and mobile
- [ ] Touch events work correctly (no scroll interference)
- [ ] Download buttons still functional
- [ ] Component works with images of varying aspect ratios
- [ ] Entry animation does not cause layout shift

## Dependencies

- **Epic 12** (Design System) — accent color for glow effect and badge styling

## Estimated Complexity

**Medium** — significant component restyle with animation logic, but contained to one file. No backend changes.
