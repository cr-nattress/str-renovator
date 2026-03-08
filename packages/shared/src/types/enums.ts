export type Tier = "free" | "pro" | "business";
export type AnalysisStatus =
  | "pending"
  | "analyzing"
  | "aggregating"
  | "generating_images"
  | "generating_reports"
  | "completed"
  | "partially_completed"
  | "failed";
export type Priority = "high" | "medium" | "low";
export type PhotoSource = "upload" | "scrape";
export type JourneyStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";
export type FeedbackRating = "like" | "dislike";
export type ActionImageStatus = "pending" | "processing" | "completed" | "failed" | "skipped";
export type ImageQuality = "low" | "medium" | "high";
export type ImageSize =
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";
