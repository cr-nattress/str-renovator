import { z } from "zod";

export const PhotoAnalysisSchema = z.object({
  filename: z.string(),
  room: z.string(),
  strengths: z.array(z.string()),
  renovations: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const ActionItemSchema = z.object({
  priority: z.number(),
  item: z.string(),
  estimated_cost: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  rooms_affected: z.array(z.string()),
});

export const PropertyAnalysisSchema = z.object({
  property_assessment: z.string(),
  style_direction: z.string(),
  photos: z.array(PhotoAnalysisSchema),
  action_plan: z.array(ActionItemSchema),
});

// Location research is a flexible JSON object, but we can validate key fields
export const LocationProfileSchema = z.object({
  area_type: z.string().optional(),
  area_bio: z.string().optional(),
  guest_demographics: z.array(z.string()).optional(),
  design_recommendations: z.array(z.string()).optional(),
}).passthrough();

// Listing extraction is very flexible
export const ListingDataSchema = z.object({}).passthrough();

// Property synthesis result
export const PropertyProfileSchema = z.object({
  property_summary: z.string().optional(),
}).passthrough();
