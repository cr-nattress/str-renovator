# Landing Page — Implementation Backlog

> Implements the Listiq landing page from `docs/plans/landing-page-design.md` (component JSX)
> and `docs/plans/landing-page-design-doc.md` (integration guide).
>
> Replaces the current `<SignIn />` widget shown to unauthenticated users with a full
> marketing landing page featuring animated SVG room transformations, before/after feed
> cards, and a CTA that funnels visitors into the app.

---

## Legend

- **Size:** S (< 1 day), M (1–3 days), L (3–5 days)
- **Priority:** P0 (must-have for launch), P1 (important polish), P2 (nice-to-have)
- **Status:** `open` | `in-progress` | `done`

---

## LP-001: Convert landing page JSX to TypeScript and add to project
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** `landing-page-design.md` contains a complete JSX component (`STRLandingPage`) with inline styles, rAF animation loop, SVG room scenes, and feed cards. No TypeScript types.

**Work:**
- Copy component code into `packages/web/src/pages/Landing.tsx`
- Add TypeScript types: `Room`, `RoomColors`, `InputMode`, prop interfaces for sub-components (`RoomScene`, `FeedCard`, `CyclingWord`)
- Rename default export from `STRLandingPage` to named export `Landing` (project convention)
- Verify it compiles with `tsc --noEmit`

**Acceptance:** Component renders without errors in isolation. Type-safe.

---

## LP-002: Wire landing page into app routing
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** `App.tsx` shows Clerk's `<SignIn />` widget for `<SignedOut>` users. All routes live inside `<SignedIn>`.

**Work:**
- Update `App.tsx`: replace the `<SignedOut>` block with `<Landing />`
- The landing page has its own full-screen layout (dark, fixed background, own nav) — it must NOT be wrapped in `<AppShell>`
- The landing page uses `position: fixed` for background — ensure no parent element clips it
- Scope the landing page's CSS reset (`*{margin:0;padding:0}`) to `.landing-page` class to avoid leaking into the authenticated app

**Acceptance:** Unauthenticated users see the landing page. Authenticated users see the dashboard. No style bleeding between the two.

---

## LP-003: Wire Sign In button to Clerk authentication
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** The landing page's SIGN IN button has no `onClick` handler.

**Work:**
- Import `useSignIn` from `@clerk/clerk-react`
- Wire SIGN IN button: `signIn.redirectToSignIn()`
- After sign-in, Clerk redirects to `/` which will now show Dashboard (since user is authenticated)
- Verify the sign-in → redirect → dashboard flow works end-to-end

**Acceptance:** Clicking SIGN IN opens Clerk auth flow. Completing auth lands on dashboard.

---

## LP-004: Wire CTA button to sign-in with intent
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** The "Analyze My Listing →" and "Upload & Analyze →" CTA buttons have no `onClick`.

**Work:**
- URL mode with input: store the listing URL in `sessionStorage` (`listiq_pending_url`), then redirect to sign-in. Post-auth, the dashboard (or a new route) reads `sessionStorage` and triggers property creation from URL.
- URL mode without input: redirect to sign-in
- Photos mode: redirect to sign-in (photo upload requires auth context)
- Add Enter key handler on the URL input to trigger CTA
- Post-auth URL consumption: on Dashboard mount, check `sessionStorage` for `listiq_pending_url`, if present pop it and call `createPropertyFromUrl` mutation automatically

**Acceptance:** User pastes URL → clicks CTA → signs in → lands on dashboard → property auto-created from URL. Clean flow.

**Decision needed:** Should unauthenticated users see analysis results before signing in, or require sign-in first? Current plan assumes sign-in first.

---

## LP-005: Tailwind CSS reset conflict mitigation
**Priority:** P0 | **Size:** S | **Status:** open

**Current state:** The landing page injects `*{box-sizing:border-box;margin:0;padding:0}` via `<style>` tag. The app uses Tailwind which includes `preflight` (a CSS reset).

**Work:**
- Scope the landing page's `<style>` reset rules to `.landing-page` selector to prevent affecting other parts of the app during transitions
- Verify that Tailwind's preflight doesn't override critical inline styles in the landing page (it shouldn't — inline styles win specificity)
- Test: landing page loads → sign in → dashboard renders correctly (no style leakage)

**Acceptance:** No CSS conflicts between landing page inline styles and Tailwind. Both pages render correctly.

---

## LP-006: Responsive layout and window resize handling
**Priority:** P1 | **Size:** S | **Status:** open

**Current state:** The component reads `window.innerWidth` and `window.innerHeight` once on mount for SVG sizing. No resize handling. Feed cards use fixed `272px` width.

**Work:**
- Add a `useEffect` with `ResizeObserver` or `window.resize` listener to update dimensions in state
- Store `[winW, winH]` in state, update on resize (debounced)
- Feed cards row: verify horizontal scroll works on mobile (currently `overflowX: auto`)
- Stats row: stack vertically on small screens (currently `display: flex` with `gap: 64`)
- Nav: verify touch-friendly hit targets on mobile (buttons currently 7px padding)

**Acceptance:** Landing page looks correct on mobile (375px), tablet (768px), and desktop (1440px). SVG resizes on orientation change.

---

## LP-007: Performance optimization — rAF loop and SVG rendering
**Priority:** P1 | **Size:** S | **Status:** open

**Current state:** The rAF loop calls `setBgAccent`, `setCenterOvl`, `setBgProgress`, `setBgPhase`, and `setBgRoomIdx` on every frame. Each `setState` triggers a re-render of the entire component tree.

**Work:**
- Consolidate rAF state into a single `useRef` object to batch updates
- Use `useRef` + manual DOM updates for high-frequency values (accent color, progress, center overlay) instead of React state — only use state for discrete phase changes
- Memoize `RoomScene` with `React.memo` to prevent unnecessary SVG re-renders
- Memoize `FeedCard` components (they don't depend on rAF state)
- Profile with React DevTools to verify frame budget stays under 16ms

**Acceptance:** Smooth 60fps animation on mid-range devices. No jank during room transitions.

---

## LP-008: Accessibility improvements
**Priority:** P1 | **Size:** S | **Status:** open

**Current state:** The landing page uses inline styles, no semantic ARIA, and emoji-based icons (🔗, 📷). Feed cards use `cursor: col-resize` but no keyboard interaction. Animations have no `prefers-reduced-motion` support.

**Work:**
- Add `prefers-reduced-motion` media query: disable rAF animation loop, show static "after" state, disable CSS keyframe animations
- Add `aria-label` to SIGN IN button and CTA button
- Add `role="tablist"` and `role="tab"` to URL/Photos tabs with `aria-selected`
- Add `alt` text to SVG scenes via `<title>` element in each SVG
- Feed cards: add `aria-label` describing the room and interaction
- Ensure color contrast meets WCAG AA for text over dark backgrounds (monospace labels at opacity 0.28 may fail — increase to 0.45 minimum)

**Acceptance:** Passes axe-core WCAG 2.0 AA audit. Respects `prefers-reduced-motion`.

---

## LP-009: Add pricing section / tier comparison below the fold
**Priority:** P2 | **Size:** M | **Status:** open

**Current state:** The landing page has hero + feed + stats. No pricing information. The existing `Pricing.tsx` page is only accessible to authenticated users.

**Work:**
- Add a pricing section below the stats row matching the landing page's dark aesthetic
- Reuse tier data from `TIER_LIMITS` in shared package
- Show Free / Pro / Business cards with key limits and CTA buttons
- Free tier CTA: "Get Started Free" → sign-up flow
- Pro/Business CTA: "Start Free Trial" → sign-up with tier selection
- Style to match landing page's monospace/serif type system and dark palette

**Acceptance:** Visitors can see pricing tiers without signing in. CTAs funnel to appropriate auth flows.

---

## LP-010: Replace placeholder stats with real data
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** Stats section shows hardcoded values: `12,400+` properties, `$58` nightly rate lift, `4.2×` ROI.

**Work:**
- **Option A (static):** Update hardcoded values to reflect actual platform metrics. Requires manual updates as the platform grows.
- **Option B (API):** Create a public `/api/v1/stats` endpoint (no auth required) returning aggregate platform metrics. Landing page fetches on mount. Cache aggressively (1h TTL).
- Stats to expose: total properties analyzed, average nightly rate improvement, average ROI multiplier

**Decision needed:** Static values for MVP, or API-backed from the start?

**Acceptance:** Stats reflect real platform data (or reasonable estimates for launch).

---

## LP-011: Add sign-up / create account flow
**Priority:** P2 | **Size:** M | **Status:** open

**Current state:** Sign In button redirects to Clerk sign-in. No dedicated sign-up path. Clerk handles sign-up as part of its auth flow, but the landing page doesn't have an explicit "Create Account" or "Get Started" button.

**Work:**
- Add a "Get Started Free" secondary CTA in the hero (below the main CTA, or as nav item)
- Wire to `signIn.redirectToSignUp()` (Clerk) for direct sign-up flow
- Consider adding a sign-up benefit section ("What you get with a free account")

**Acceptance:** New visitors have a clear path to create an account distinct from sign-in.

---

## LP-012: SEO and meta tags
**Priority:** P2 | **Size:** S | **Status:** open

**Current state:** The SPA has a single `index.html` with no dynamic meta tags. Landing page content isn't indexable.

**Work:**
- Add `<title>`, `<meta name="description">`, and Open Graph tags to `index.html`
- Consider adding `react-helmet-async` for dynamic meta tag management
- Add structured data (JSON-LD) for the landing page (Organization schema)
- Ensure the landing page's h1 is SEO-friendly (it is: "See your property's...")

**Acceptance:** Sharing the URL on social media shows correct title, description, and preview image.

---

## Implementation Priority Order

| Phase | Items | Theme |
|-------|-------|-------|
| **Phase 1** | LP-001, LP-002, LP-003, LP-004, LP-005 | Core integration — get the page live and functional |
| **Phase 2** | LP-006, LP-007, LP-008 | Polish — responsive, performant, accessible |
| **Phase 3** | LP-009, LP-010, LP-011, LP-012 | Growth — pricing, real stats, sign-up, SEO |
