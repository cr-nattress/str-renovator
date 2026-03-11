import type { Priority, ImageQuality, Tier } from "./enums.js";

// ── Core Domain Models ──────────────────────────────────────────────

export interface PhotoAnalysis {
  filename: string;
  room: string;
  strengths: string[];
  renovations: string;
  priority: Priority;
  tags?: string[];
  constraints?: string[];
  confidence?: number;
  reasoning?: string;
}

export interface ActionItem {
  priority: number;
  item: string;
  estimated_cost: string;
  impact: Priority;
  rooms_affected: string[];
  reasoning?: string;
}

export interface PropertyAnalysis {
  property_assessment: string;
  style_direction: string;
  confidence?: number;
  reasoning?: string;
  photos: PhotoAnalysis[];
  action_plan: ActionItem[];
}

export interface PhotoMetadataBlock {
  filename: string;
  display_name?: string;
  description?: string;
  tags?: string[];
  constraints?: string[];
}

// ── AI Metadata ─────────────────────────────────────────────────────

export interface AiMetadata {
  model: string;
  tokensUsed: number;
  promptVersion: string;
}

export interface AiResult<T> {
  data: T;
  metadata: AiMetadata;
}

// ── Tier Config ─────────────────────────────────────────────────────

export interface TierLimits {
  properties: number;
  photosPerProperty: number;
  analysesPerMonth: number;
  rerunsPerPhoto: number;
  imageQuality: ImageQuality;
  urlScraping: boolean;
}
