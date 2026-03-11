/**
 * @module counter-manager
 * @capability Increments user tier counters on analysis submission
 * @layer Execution
 *
 * Listens to AnalysisSubmitted events and increments the user's
 * `analyses_this_month` counter. This side effect was previously
 * inlined in the submit-analysis command handler.
 *
 * @see packages/api/src/commands/submit-analysis.ts — publisher
 * @see packages/api/src/repositories/user.repository.ts — counter store
 */

import type { DomainEvent, AnalysisSubmittedEvent } from "@str-renovator/shared";
import * as userRepo from "../../repositories/user.repository.js";
import { logger } from "../../config/logger.js";

export async function handleCounterIncrement(event: DomainEvent): Promise<void> {
  const e = event as AnalysisSubmittedEvent;

  await userRepo.incrementAnalysesThisMonth(e.userId);

  logger.info(
    { userId: e.userId, analysisId: e.data.analysisId },
    "incremented analyses_this_month via event handler",
  );
}
