/**
 * @module audit-logger
 * @capability Catch-all event handler that logs every domain event
 * @layer Execution
 *
 * Registered as a "*" handler so every emitted domain event is captured
 * as structured JSON via pino for audit trail and observability.
 *
 * @see packages/api/src/events/event-bus.ts — pub/sub registration
 */

import type { DomainEvent } from "@str-renovator/shared";
import { logger } from "../../config/logger.js";

export async function handleAuditLog(event: DomainEvent): Promise<void> {
  logger.info(
    {
      domainEvent: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      userId: event.userId,
      data: event.data,
    },
    "domain event emitted",
  );
}
