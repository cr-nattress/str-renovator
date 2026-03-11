/**
 * @module register
 * @capability Registers all domain event handlers at application boot
 * @layer Orchestration
 *
 * Called once during server startup to wire event handlers to the bus.
 *
 * @see packages/api/src/events/event-bus.ts — onEvent registration
 * @see packages/api/src/server.ts — boot sequence
 */

import { onEvent } from "./event-bus.js";
import { handleAuditLog } from "./handlers/audit-logger.js";
import { handleCounterIncrement } from "./handlers/counter-manager.js";
import { handleAnalysisFinalization } from "./handlers/analysis-finalizer.js";

export function registerEventHandlers(): void {
  onEvent("*", handleAuditLog);
  onEvent("AnalysisSubmitted", handleCounterIncrement);
  onEvent("RenovationCompleted", handleAnalysisFinalization);
  onEvent("RenovationFailed", handleAnalysisFinalization);
}
