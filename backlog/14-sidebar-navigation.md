# Epic 14: Sidebar Navigation Overhaul

## Summary

Restructure the sidebar from a barren 3-link list into a full-featured navigation system with icons, grouped sections, and contextual property navigation. The app has rich views (analyses, renovation journeys, design history) that are invisible from the nav.

## Why

The design analysis identifies the sidebar as High Priority Issue #5. Users have no global wayfinding beyond the dashboard — the only navigation options are Dashboard, Pricing, and Usage. The app's core features (analyses, renovations, design journeys) are only reachable by drilling into a property card.

## Current State

### Sidebar Navigation (`Sidebar.tsx`)
```tsx
// 3 NavLink items total — no icons, no grouping
<NavLink to="/">Dashboard</NavLink>
<NavLink to="/pricing">Pricing</NavLink>
<NavLink to="/usage">Usage</NavLink>
```

The sidebar has:
- No icons on nav items
- No grouping or sections
- No contextual nav (current property, active analysis)
- `UserButton` from Clerk at the bottom (small, hidden)

### Available Pages (not in nav)
- `/properties/:id` — Property detail
- `/properties/:id/analysis/:analysisId` — Analysis view
- `/properties/:id/analysis/:analysisId/renovation/:renovationId` — Renovation view
- `/properties/:id/journey` — Design journey
- `/properties/:id/journey/:itemId` — Journey item detail

## Scope

### 1. Add Icons to All Nav Items

Lucide React is already installed. Add icons to every navigation link.

```tsx
import { Home, BarChart3, Sparkles, History, DollarSign, Activity } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Properties", end: true },
  { to: "/pricing", icon: DollarSign, label: "Pricing" },
  { to: "/usage", icon: Activity, label: "Usage" },
];
```

### 2. Add Grouped Navigation Sections

Organize nav into logical groups:

```
── MAIN ──────────────────
  🏠 Properties          (dashboard)

── TOOLS ─────────────────
  📊 Analyses             (list all analyses)
  ✨ Renovations          (list all renovations)
  📋 Design Journey       (journey overview)

── ACCOUNT ───────────────
  💰 Pricing
  📈 Usage
  👤 [UserButton]
```

### 3. Contextual Property Nav (When Property Selected)

When a user is viewing a specific property, show contextual sub-navigation:

```
── CURRENT PROPERTY ──────
  🏠 Property Name Here
    ├─ Overview
    ├─ Photos
    ├─ Analysis (if exists)
    ├─ Renovation (if exists)
    └─ Design Journey
```

This requires reading the current route params and conditionally rendering the property context section.

### 4. Active State Styling

- Active nav item: solid background with primary color text
- Hover: subtle background highlight
- Inactive: muted text color
- Section headers: uppercase, smaller, muted

### 5. Promote UserButton

Move Clerk's `UserButton` from hidden bottom corner to a more visible position within the Account section.

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/layout/Sidebar.tsx` | Complete rewrite — icons, sections, contextual nav |
| `packages/web/src/App.tsx` (or router) | May need to expose current property context for sidebar |

## Acceptance Criteria

- [ ] Every nav item has a Lucide icon
- [ ] Nav items grouped into logical sections with headers
- [ ] Active route highlighted with clear visual indicator
- [ ] Contextual property sub-nav appears when viewing a property
- [ ] UserButton positioned prominently in Account section
- [ ] Navigation works correctly with React Router v7 `NavLink`
- [ ] Sidebar remains usable at all viewport heights (scrollable if needed)
- [ ] All existing routes accessible from sidebar

## Dependencies

- **Epic 13** (Visual Identity) — sidebar header uses the logomark
- **Epic 12** (Design System) — uses committed color palette for sidebar dark tone

## Estimated Complexity

**Medium** — structural component rewrite, contextual routing logic, but no backend changes.
