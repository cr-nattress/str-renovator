import type { Tier, TierLimits } from "../types/index.js";

export const SUPPORTED_FORMATS = new Set([".jpeg", ".jpg", ".png", ".webp"]);

export const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    properties: 1,
    photosPerProperty: 5,
    analysesPerMonth: 2,
    rerunsPerPhoto: 1,
    imageQuality: "low",
    urlScraping: true,
  },
  pro: {
    properties: 5,
    photosPerProperty: 20,
    analysesPerMonth: 10,
    rerunsPerPhoto: 5,
    imageQuality: "high",
    urlScraping: true,
  },
  business: {
    properties: 25,
    photosPerProperty: 50,
    analysesPerMonth: 50,
    rerunsPerPhoto: 20,
    imageQuality: "high",
    urlScraping: true,
  },
};

export const CONCURRENCY = {
  analyses: 2,
  imageGeneration: 3,
  imagesPerMinute: 10,
  analysisBatchSize: 5,
  analysisBatchConcurrency: 2,
  actionImageGeneration: 2,
} as const;
