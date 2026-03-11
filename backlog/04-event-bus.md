# Epic 04: Domain Event Bus

## Summary

Introduce an explicit domain event bus backed by BullMQ. Currently, domain events happen implicitly as side effects scattered across route handlers and job workers. This epic makes them first-class citizens — published, subscribable, and auditable.

## Why

The current codebase has ~15 implicit domain events that are never formally published:

- `analyses_this_month` counter increment is a side effect in a route handler
- Renovation completion triggers parent analysis counter increment buried in `worker.ts` failure handler
- Property scrape completion silently updates `scraped_data` with no notification
- No audit trail of what triggered state changes
- No way to add cross-cutting hooks (notifications, cache invalidation, analytics) without modifying business logic

## Current State

### Implicit Events (happening now, not published)

| Event | Where It Happens | Side Effect |
|-------|-----------------|-------------|
| Analysis submitted | `routes/analyses.ts:48-60` | Creates row, enqueues job, increments counter |
| Analysis completed | `jobs/steps/finalize-analysis.ts` | Updates status to completed/partially_completed |
| Analysis failed | `jobs/analyze.job.ts` catch block | Updates status to failed |
| Renovation completed | `jobs/renovate.job.ts` | Updates row, increments parent counter, checks finalization |
| Renovation failed | `jobs/worker.ts:71-92` | Moves to DLQ, increments parent counter |
| Listing scraped | `jobs/scrape.job.ts` phases | Updates property.scraped_data |
| Location researched | `jobs/scrape.job.ts` or `location-research.job.ts` | Updates property.location_profile |
| Profile synthesized | `jobs/scrape.job.ts` phase 5 | Updates property.property_profile |
| Reviews analyzed | `jobs/scrape.job.ts` phase 2.5 | Updates property.review_analysis |
| Photo uploaded | `routes/photos.ts:57-78` | Creates photo rows |
| Photo deleted | `routes/photos.ts:153-168` | Deletes storage + row |
| Property created | `routes/properties.ts:55` | Creates row |
| Property deleted | `routes/properties.ts:143` | Cascading delete |
| Feedback submitted | `routes/renovations.ts:85-92` | Creates feedback row |
| Journey item updated | `routes/design-journey.ts:138` | Updates row |

### BullMQ Infrastructure Already Exists

- Redis connection configured in `config/queue.ts`
- 5 queues + 5 DLQs already running
- Workers in `jobs/worker.ts` with failure handling
- Job enqueue functions in `services/queue.service.ts`

## Scope

### 1. Define Domain Event Types

**File:** `packages/shared/src/types/domain-events.ts`

```typescript
interface BaseDomainEvent {
  type: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Property events
interface PropertyCreatedEvent extends BaseDomainEvent {
  type: "PropertyCreated";
  entityType: "property";
  data: { name: string; listingUrl?: string };
}

// Analysis events
interface AnalysisSubmittedEvent extends BaseDomainEvent {
  type: "AnalysisSubmitted";
  entityType: "analysis";
  data: { propertyId: string; quality: string; photoCount: number };
}

interface AnalysisCompletedEvent extends BaseDomainEvent {
  type: "AnalysisCompleted";
  entityType: "analysis";
  data: { propertyId: string; photoCount: number; batchCount: number; promptVersion: string };
}

// ... ~15 total event types
```

### 2. Create Event Bus Service

**File:** `packages/api/src/events/event-bus.ts`

Lightweight pub/sub backed by BullMQ for durability:

```typescript
type EventHandler = (event: DomainEvent) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();

export function onEvent(type: string, handler: EventHandler): void;
export async function publishEvent(event: DomainEvent): Promise<void>;
export async function publishEvents(events: DomainEvent[]): Promise<void>;
```

Implementation options:
- **Option A:** In-process handlers (simple, synchronous within the same process)
- **Option B:** BullMQ "events" queue for cross-process durability

Start with Option A (in-process) — it covers 90% of use cases without infrastructure changes.

### 3. Create Event Handlers

**File:** `packages/api/src/events/handlers/`

| Handler File | Listens To | Action |
|-------------|-----------|--------|
| `audit-logger.ts` | All events | Log structured event to pino |
| `counter-manager.ts` | `AnalysisSubmitted` | Increment `analyses_this_month` |
| `analysis-finalizer.ts` | `RenovationCompleted`, `RenovationFailed` | Check if all renovations done, finalize analysis |

### 4. Publish Events from Commands

After Epic 02 (commands), each command handler publishes its events:

```typescript
// In submit-analysis command
const events: DomainEvent[] = [
  { type: "AnalysisSubmitted", entityType: "analysis", entityId: analysis.id, ... }
];
await publishEvents(events);
return { data: analysis, events, availableActions: [...] };
```

### 5. Register Handlers at Startup

**File:** `packages/api/src/events/register.ts`

Called from `server.ts` during boot:

```typescript
export function registerEventHandlers(): void {
  onEvent("AnalysisSubmitted", handleAnalysisSubmitted);
  onEvent("RenovationCompleted", handleRenovationCompleted);
  onEvent("*", auditLogHandler); // catch-all for audit trail
}
```

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/shared/src/types/domain-events.ts` | ~100 |
| `packages/api/src/events/event-bus.ts` | ~50 |
| `packages/api/src/events/register.ts` | ~20 |
| `packages/api/src/events/handlers/audit-logger.ts` | ~20 |
| `packages/api/src/events/handlers/counter-manager.ts` | ~25 |
| `packages/api/src/events/handlers/analysis-finalizer.ts` | ~30 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/server.ts` | Call `registerEventHandlers()` at startup |
| `packages/api/src/commands/*.ts` | Publish events (after Epic 02) |
| `packages/api/src/jobs/worker.ts` | Remove inline counter logic, publish events instead |
| `packages/shared/src/index.ts` | Export domain event types |

## Acceptance Criteria

- [ ] ~15 domain event types defined with typed payloads
- [ ] Event bus supports register + publish pattern
- [ ] Audit logger captures all events to structured log
- [ ] Counter increment for `analyses_this_month` moved from route to event handler
- [ ] Renovation completion counter moved from worker to event handler
- [ ] All existing behavior preserved (event handlers replicate current side effects)
- [ ] Events visible in pino logs for debugging

## Dependencies

- Epic 02 (Command Handlers) — commands are the natural publishers of events

## Estimated Complexity

Medium — the bus itself is simple. The work is in identifying all implicit events and ensuring the handlers replicate existing behavior exactly.
