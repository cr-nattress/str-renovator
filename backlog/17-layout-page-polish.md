# Epic 17: Layout & Page Polish

## Summary

A collection of layout and page-level improvements: redesigned dashboard empty state, page transition animations, content max-width constraint, and modal pattern consistency. Each is low effort individually; together they eliminate the "wireframe" feel.

## Why

The design analysis identifies four medium-priority issues that compound:
- **#8:** Empty state is a dashed-border box with "No properties yet" — uninspiring for the launch moment
- **#9:** Route changes are instant cuts — no transition, no polish
- **#10:** Content stretches full-width on large screens — unreadable line lengths
- **#12:** Dashboard modal uses hardcoded `bg-white` instead of shadcn/ui `Dialog` — inconsistent, breaks dark mode

## Current State

### Dashboard Empty State (`Dashboard.tsx` L37-50)
```tsx
// Dashed border box with muted text
<div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
  <p className="text-muted-foreground">No properties yet.</p>
  <Button>Add Property</Button>
</div>
```

### Page Transitions
None — instant route cuts. `App.tsx` renders `<Outlet>` directly.

### Content Width (`AppShell.tsx`)
```tsx
<main className="flex-1 bg-gray-50 overflow-auto p-8">
  {children}
</main>
```
No `max-width` — text runs edge to edge on wide monitors.

### Dashboard Modal (`Dashboard.tsx`)
```tsx
// Hardcoded white, raw × character
<div className="bg-white rounded-xl shadow-xl p-6">
  <button>×</button>
  ...
</div>
```
Not using shadcn/ui `Dialog` component (which is already installed and available).

## Scope

### 1. Redesigned Empty State

Replace the low-energy empty state with an inspiring launch moment:

```tsx
<div className="text-center py-20">
  {/* Animated house icon with sparkle */}
  <div className="relative w-24 h-24 mx-auto mb-6">
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10
                    flex items-center justify-center animate-pulse-border border-2">
      <Home className="w-10 h-10 text-primary" />
    </div>
    <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full
                    flex items-center justify-center">
      <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
    </div>
  </div>
  <h2 className="text-xl font-semibold text-foreground mb-2">
    Ready to transform your first property?
  </h2>
  <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
    Upload photos and our AI will generate renovation ideas, prioritize
    improvements, and show you the transformation before you spend a dollar.
  </p>
  <Button size="lg">
    <Plus className="w-4 h-4 mr-2" />
    Add Your First Property
  </Button>
  <p className="text-xs text-muted-foreground/60 mt-3">
    Takes less than 2 minutes
  </p>
</div>
```

### 2. Page Transition Animations

Add fade+slide transitions on route changes using Framer Motion:

```tsx
// Wrap each route's page component
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

<AnimatePresence mode="wait">
  <motion.div key={location.pathname} variants={pageVariants}
              initial="initial" animate="animate" exit="exit">
    <Outlet />
  </motion.div>
</AnimatePresence>
```

The `duration: 0.2` is subtle — perceptible but doesn't slow navigation. Reinforces the "transformation" brand metaphor.

### 3. Content Max-Width Constraint

Add a max-width container inside `AppShell`:

```tsx
<main className="flex-1 bg-gray-50 overflow-auto">
  <div className="max-w-5xl mx-auto px-6 py-8">
    {children}
  </div>
</main>
```

This prevents unreadable line lengths on wide screens while maintaining breathing room.

### 4. Replace Dashboard Modal with shadcn/ui Dialog

Replace the hardcoded modal with the existing `Dialog` component:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Add Property</DialogTitle>
    </DialogHeader>
    {/* existing form content */}
  </DialogContent>
</Dialog>
```

This uses CSS variables (dark mode ready), proper close button, focus trapping, and escape-to-close — all built into shadcn/ui's Dialog.

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/pages/Dashboard.tsx` | Redesign empty state, replace modal with Dialog |
| `packages/web/src/components/layout/AppShell.tsx` | Add `max-w-5xl mx-auto` container |
| `packages/web/src/App.tsx` (or layout route) | Add AnimatePresence + page transition wrapper |
| `packages/web/package.json` | Add `framer-motion` if not already present (shared with Epic 15) |

## Acceptance Criteria

- [ ] Empty state shows animated house icon, inspirational copy, and prominent CTA
- [ ] Empty state includes value proposition text and effort estimate
- [ ] Route changes have a subtle fade+slide animation (200ms)
- [ ] Page transitions don't interfere with scroll position or form state
- [ ] Content has `max-w-5xl` constraint — readable line lengths on wide screens
- [ ] Dashboard modal uses shadcn/ui `Dialog` (not hardcoded `bg-white`)
- [ ] Dialog has proper focus trapping, escape-to-close, overlay click-to-close
- [ ] All existing dashboard functionality preserved (quick add, detailed form, property list)

## Dependencies

- **Epic 12** (Design System) — empty state gradient uses primary/accent colors
- **Epic 15** (PhotoCompare) — shares `framer-motion` dependency

## Estimated Complexity

**Low-Medium** — four independent small changes. Empty state is the largest (copy + icon + layout), but still contained to one file. Page transitions require wrapping the router outlet.
