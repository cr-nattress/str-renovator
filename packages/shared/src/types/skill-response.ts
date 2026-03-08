/**
 * @module SkillResponse
 * @capability Shared contract type for AI skill outputs
 * @layer Contract (shared package)
 *
 * Every AI skill returns this envelope. Consumers (web, CLI, agents) use
 * `contentType` to select the appropriate rendering component. Fields like
 * `confidence`, `reasoning`, and `citations` power the trust & transparency UI.
 */

export type ContentType = "list" | "comparison" | "plan" | "code" | "prose";

export interface Citation {
  index: number;
  source: string;
  url?: string;
  excerpt?: string;
}

export interface AgentTraceEntry {
  step: number;
  action: string;
  result?: string;
  timestamp: string;
}

export interface SkillResponse<T> {
  data: T;
  contentType: ContentType;
  confidence?: number;
  reasoning?: string;
  citations?: Citation[];
  promptVersion: string;
  agentTrace?: AgentTraceEntry[];
}
