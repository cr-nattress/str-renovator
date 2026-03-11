/**
 * @module event-bus
 * @capability In-process domain event pub/sub
 * @layer Orchestration
 *
 * Lightweight in-process event bus for domain events. Handlers register
 * for specific event types or "*" for all events. Errors in handlers
 * are logged but never propagated to the publisher.
 *
 * @see packages/shared/src/types/domain-events.ts — typed event definitions
 * @see packages/api/src/events/register.ts — handler registration at boot
 */

import type { DomainEvent, DomainEventType } from "@str-renovator/shared";
import { logger } from "../config/logger.js";

type EventHandler = (event: DomainEvent) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();

/**
 * Register a handler for a specific event type, or "*" for all events.
 */
export function onEvent(type: DomainEventType | "*", handler: EventHandler): void {
  const existing = handlers.get(type) ?? [];
  existing.push(handler);
  handlers.set(type, existing);
}

/**
 * Publish a single domain event. Invokes type-specific handlers first,
 * then catch-all ("*") handlers. Errors are logged, never thrown.
 */
export async function publishEvent(event: DomainEvent): Promise<void> {
  const typeHandlers = handlers.get(event.type) ?? [];
  const catchAllHandlers = handlers.get("*") ?? [];

  for (const handler of [...typeHandlers, ...catchAllHandlers]) {
    try {
      await handler(event);
    } catch (err) {
      logger.error(
        { eventType: event.type, entityId: event.entityId, err: err instanceof Error ? err.message : err },
        "event handler error — continuing",
      );
    }
  }
}

/**
 * Publish multiple domain events in sequence.
 */
export async function publishEvents(events: DomainEvent[]): Promise<void> {
  for (const event of events) {
    await publishEvent(event);
  }
}
