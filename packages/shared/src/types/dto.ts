import type {
  Priority,
  ImageQuality,
  ImageSize,
  JourneyStatus,
  FeedbackRating,
} from "./enums.js";

export interface CreatePropertyDto {
  name: string;
  description?: string;
  listing_url?: string;
  context?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface UpdatePropertyDto {
  name?: string;
  description?: string;
  listing_url?: string;
  context?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
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

export interface UpdatePhotoMetadataDto {
  display_name?: string | null;
  description?: string | null;
  tags?: string[];
  constraints?: string[];
}

export interface CreateJourneyItemDto {
  priority: number;
  title: string;
  description?: string;
  estimated_cost?: string;
  impact: Priority;
  rooms_affected: string[];
}
