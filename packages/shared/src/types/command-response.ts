/**
 * @module CommandResponse
 * @capability Shared contract type for command/mutation outputs
 * @layer Contract (shared package)
 *
 * Every state-mutating command returns this envelope. `availableActions`
 * drives dynamic CTAs in the frontend — the UI never hardcodes available
 * actions. `events` captures domain events emitted during the command.
 */

import type { DomainEvent } from "./domain-events.js";

export interface AvailableAction {
  label: string;
  command: string;
  params?: Record<string, unknown>;
  confirmation?: string;
  variant?: "primary" | "secondary" | "destructive";
  icon?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface CommandResponse<T> {
  data: T;
  availableActions: AvailableAction[];
  events: DomainEvent[];
}
