/**
 * @module execute
 * @capability Command infrastructure — shared types for all command handlers
 * @layer Orchestration
 *
 * Defines the CommandContext and CommandResult types that every command handler
 * conforms to. Routes parse HTTP input and build CommandContext; commands
 * execute business logic and return CommandResult.
 *
 * @see packages/shared/src/types/command-response.ts for AvailableAction / DomainEvent
 */

import type { DbUser, AvailableAction, DomainEvent } from "@str-renovator/shared";

export interface CommandContext {
  userId: string;
  user: DbUser;
  tierLimit?: number;
}

export type CommandHandler<TInput, TOutput> = (
  input: TInput,
  ctx: CommandContext,
) => Promise<CommandResult<TOutput>>;

export interface CommandResult<T> {
  data: T;
  events: DomainEvent[];
  availableActions: AvailableAction[];
}
