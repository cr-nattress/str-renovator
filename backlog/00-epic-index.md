# STR Renovator: Architecture Evolution Backlog

Epics to move the app from "dashboard with AI features" toward the AI-native capability platform architecture defined in the global CLAUDE.md.

## Dependency Graph

### Architecture Epics (01-11)
```
01-capability-registry (foundation)
  ├── 02-command-handlers
  │     ├── 04-event-bus
  │     ├── 06-platform-driven-actions
  │     ├── 08-intent-based-input
  │     ├── 10-mcp-server
  │     └── 11-editable-ai-output
  ├── 03-ai-skill-modules
  │     └── 05-connectors
  └── 07-confidence-reasoning (independent)
      09-streaming-everywhere (independent)
```

### UI/UX Epics (12-17)
```
12-design-system-foundation (independent — start here)
  ├── 13-visual-identity
  │     └── 14-sidebar-navigation
  ├── 15-photo-compare-hero
  ├── 16-ai-component-polish
  └── 17-layout-page-polish
```

## Epic Summary

### Architecture Epics

| # | Epic | Impact | Effort | Dependencies |
|---|------|--------|--------|-------------|
| 01 | [Capability Registry & Skill Manifests](./01-capability-registry.md) | Foundation for everything | Low | None |
| 02 | [Extract Command Handlers](./02-command-handlers.md) | Clean architecture, testability | Medium | 01 |
| 03 | [AI Skill Modules](./03-ai-skill-modules.md) | Modular AI, clear contracts | Medium | 01 |
| 04 | [Domain Event Bus](./04-event-bus.md) | Decoupling, audit trail, hooks | Medium | 02 |
| 05 | [Connector Abstractions](./05-connectors.md) | Testability, swappability | Low-Medium | 03 |
| 06 | [Platform-Driven Actions](./06-platform-driven-actions.md) | AI-native UX transformation | Medium | 01, 02 |
| 07 | [Confidence & Reasoning Everywhere](./07-confidence-reasoning.md) | Trust & transparency | Low-Medium | None |
| 08 | [Intent-Based Property Creation](./08-intent-based-input.md) | UX transformation | Medium | 02 |
| 09 | [Streaming Everywhere](./09-streaming-everywhere.md) | Responsiveness, UX | Medium | None |
| 10 | [MCP Server](./10-mcp-server.md) | Agent-native access | Medium | 01, 02 |
| 11 | [Editable AI Output & History](./11-editable-ai-output.md) | Trust, user control | Medium-High | 02 |

### UI/UX Epics (from [Frontend Design Analysis](../FRONTEND_DESIGN_ANALYSIS.md))

| # | Epic | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 12 | [Design System Foundation](./12-design-system-foundation.md) | Visual identity, 60% of quality perception | Low | ✅ DONE |
| 13 | [Visual Identity & Branding](./13-visual-identity.md) | Product credibility | Medium | ✅ DONE |
| 14 | [Sidebar Navigation Overhaul](./14-sidebar-navigation.md) | Wayfinding, feature discovery | Medium | ✅ DONE |
| 15 | [PhotoCompare Hero Experience](./15-photo-compare-hero.md) | Flagship feature moment | Medium | ✅ DONE |
| 16 | [AI Component UX Polish](./16-ai-component-polish.md) | Trust signals, discoverability | Low | ✅ DONE |
| 17 | [Layout & Page Polish](./17-layout-page-polish.md) | Professional finish, usability | Low-Medium | ✅ DONE |

## Recommended Implementation Order

### Phase 1: Foundation (Epics 01, 07, 09)
Three independent epics that can run in parallel. Low risk, high value.
- **01** declares what capabilities exist (metadata only, no runtime changes)
- **07** adds confidence/reasoning to all AI outputs (prompt + UI updates)
- **09** extends SSE streaming to scrape/renovation (generalizes existing pattern)

### Phase 1b: Visual Foundation (Epic 12)
Can run in parallel with Phase 1. No backend dependencies.
- **12** commits to typography + color palette — the foundation every other UI epic builds on

### Phase 2: Architecture (Epics 02, 03)
The two structural refactors that reshape the backend.
- **02** extracts command handlers from routes (enables everything downstream)
- **03** organizes AI services into skill modules (clean boundaries)

### Phase 2b: Visual Identity & Polish (Epics 13, 15, 16, 17)
Can run in parallel with Phase 2. Frontend-only changes.
- **13** creates logomark, wordmark, favicon — gives the product a face
- **15** transforms PhotoCompare into a hero moment (animated reveal, premium handle)
- **16** increases visual weight of AI transparency components (3 small changes)
- **17** redesigns empty state, adds page transitions, max-width, Dialog migration

### Phase 3: Platform Surfaces (Epics 04, 05, 06)
Build on the restructured backend to add new capabilities.
- **04** formalizes domain events (enables hooks, audit, webhooks)
- **05** wraps external deps in connector interfaces (testability)
- **06** makes the frontend consume platform-driven actions (AI-native UX)

### Phase 3b: Navigation (Epic 14)
Depends on 13 (logomark for sidebar header).
- **14** restructures sidebar with icons, grouped sections, contextual property nav

### Phase 4: AI-Native UX (Epics 08, 10, 11)
Transform the user experience.
- **08** replaces property form with intent-based input
- **10** exposes platform as MCP server for AI agents
- **11** makes all AI output editable with undo history
