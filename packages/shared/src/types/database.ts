import type {
  Tier,
  AnalysisStatus,
  Priority,
  PhotoSource,
  JourneyStatus,
  FeedbackRating,
  ActionImageStatus,
} from "./enums.js";
import type { PropertyAnalysis } from "./domain.js";

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
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  scraped_data: Record<string, unknown> | null;
  location_profile: Record<string, unknown> | null;
  property_profile: Record<string, unknown> | null;
  review_analysis: Record<string, unknown> | null;
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
  display_name: string | null;
  description: string | null;
  tags: string[];
  constraints: string[];
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
  total_batches: number;
  completed_batches: number;
  failed_batches: number;
  is_active: boolean;
  prompt_version: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbAnalysisBatch {
  id: string;
  analysis_id: string;
  batch_index: number;
  photo_ids: string[];
  filenames: string[];
  status: "pending" | "processing" | "completed" | "failed";
  result_json: PropertyAnalysis | null;
  error: string | null;
  prompt_version: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
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
  prompt_version: string | null;
  model: string | null;
  tokens_used: number | null;
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

export interface DbEditHistory {
  id: string;
  entity_type: string;
  entity_id: string;
  field_path: string;
  previous_value: unknown;
  new_value: unknown;
  edited_by: string;
  source: "user" | "ai" | "scrape";
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
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  actual_cost: number | null;
  impact: Priority;
  rooms_affected: string[];
  status: JourneyStatus;
  notes: string | null;
  image_storage_path: string | null;
  image_status: ActionImageStatus;
  source_photo_id: string | null;
  prompt_version: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
  updated_at: string;
}
