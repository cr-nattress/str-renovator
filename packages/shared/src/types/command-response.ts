/**
 * @module CommandResponse
 * @capability Shared contract type for command/mutation outputs
 * @layer Contract (shared package)
 *
 * Every state-mutating command returns this envelope. `availableActions`
 * drives dynamic CTAs in the frontend — the UI never hardcodes available
 * actions. `events` captures domain events emitted during the command.
 */

export interface AvailableAction {
  label: string;
  command: string;
  params?: Record<string, unknown>;
  confirmation?: string;
}

export interface DomainEvent {
  type: string;
  entityId: string;
  entityType: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface CommandResponse<T> {
  data: T;
  availableActions: AvailableAction[];
  events: DomainEvent[];
}
