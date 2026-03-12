import { z } from "zod";

export const PhotoAnalysisSchema = z.object({
  filename: z.string(),
  room: z.string(),
  strengths: z.array(z.string()),
  renovations: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  tags: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});

export const ActionItemSchema = z.object({
  priority: z.number(),
  item: z.string(),
  estimated_cost: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  rooms_affected: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});

export const PropertyAnalysisSchema = z.object({
  property_assessment: z.string(),
  style_direction: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
  photos: z.array(PhotoAnalysisSchema),
  action_plan: z.array(ActionItemSchema),
});

// Location research is a flexible JSON object, but we can validate key fields
export const LocationProfileSchema = z.object({
  area_type: z.string().optional(),
  area_bio: z.string().optional(),
  guest_demographics: z.array(z.string()).optional(),
  design_recommendations: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
}).passthrough();

// Listing extraction is very flexible
export const ListingDataSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
}).passthrough();

// Review analysis result
export const ReviewAnalysisSchema = z.object({
  review_summary: z.string().optional(),
  overall_sentiment: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
}).passthrough();

// Property synthesis result
export const PropertyProfileSchema = z.object({
  property_summary: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
}).passthrough();
