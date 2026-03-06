// ── Domain Types (ported from CLI) ──────────────────────────────────

export interface PhotoAnalysis {
  filename: string;
  room: string;
  strengths: string[];
  renovations: string;
  priority: "high" | "medium" | "low";
}

export interface ActionItem {
  priority: number;
  item: string;
  estimated_cost: string;
  impact: "high" | "medium" | "low";
  rooms_affected: string[];
}

export interface PropertyAnalysis {
  property_assessment: string;
  style_direction: string;
  photos: PhotoAnalysis[];
  action_plan: ActionItem[];
}

// ── Database Row Types ──────────────────────────────────────────────

export type Tier = "free" | "pro" | "business";
export type AnalysisStatus =
  | "pending"
  | "analyzing"
  | "generating_images"
  | "generating_reports"
  | "completed"
  | "failed";
export type Priority = "high" | "medium" | "low";
export type PhotoSource = "upload" | "scrape";
export type JourneyStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";
export type FeedbackRating = "like" | "dislike";
export type ImageQuality = "low" | "medium" | "high";
export type ImageSize =
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";

export interface DbUser {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tier: Tier;
  analyses_this_month: number;
  current_period_start: string;
  created_at: string;
  updated_at: string;
}

export interface DbProperty {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  listing_url: string | null;
  context: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPhoto {
  id: string;
  property_id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  source: PhotoSource;
  created_at: string;
}

export interface DbAnalysis {
  id: string;
  property_id: string;
  user_id: string;
  status: AnalysisStatus;
  property_assessment: string | null;
  style_direction: string | null;
  raw_json: PropertyAnalysis | null;
  total_photos: number;
  completed_photos: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAnalysisPhoto {
  id: string;
  analysis_id: string;
  photo_id: string;
  room: string;
  strengths: string[];
  renovations: string;
  priority: Priority;
  report: string | null;
  created_at: string;
}

export interface DbRenovation {
  id: string;
  analysis_photo_id: string;
  user_id: string;
  storage_path: string | null;
  iteration: number;
  parent_renovation_id: string | null;
  feedback_context: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error: string | null;
  created_at: string;
}

export interface DbFeedback {
  id: string;
  renovation_id: string;
  user_id: string;
  rating: FeedbackRating;
  comment: string | null;
  created_at: string;
}

export interface DbDesignJourneyItem {
  id: string;
  property_id: string;
  analysis_id: string | null;
  user_id: string;
  priority: number;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  actual_cost: number | null;
  impact: Priority;
  rooms_affected: string[];
  status: JourneyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── API DTOs ────────────────────────────────────────────────────────

export interface CreatePropertyDto {
  name: string;
  description?: string;
  listing_url?: string;
  context?: string;
}

export interface UpdatePropertyDto {
  name?: string;
  description?: string;
  listing_url?: string;
  context?: string;
}

export interface CreateAnalysisDto {
  quality?: ImageQuality;
  size?: ImageSize;
}

export interface SubmitFeedbackDto {
  rating: FeedbackRating;
  comment?: string;
}

export interface UpdateJourneyItemDto {
  status?: JourneyStatus;
  actual_cost?: number;
  notes?: string;
}

export interface CreateJourneyItemDto {
  priority: number;
  title: string;
  description?: string;
  estimated_cost?: string;
  impact: Priority;
  rooms_affected: string[];
}

// ── SSE Event Types ─────────────────────────────────────────────────

export type SSEEvent =
  | { type: "status"; status: AnalysisStatus }
  | { type: "progress"; completed: number; total: number }
  | { type: "photo_complete"; photoId: string; room: string }
  | { type: "renovation_complete"; photoId: string; renovationId: string }
  | { type: "error"; message: string }
  | { type: "done" };

// ── Tier Config ─────────────────────────────────────────────────────

export interface TierLimits {
  properties: number;
  photosPerProperty: number;
  analysesPerMonth: number;
  rerunsPerPhoto: number;
  imageQuality: ImageQuality;
  urlScraping: boolean;
}
