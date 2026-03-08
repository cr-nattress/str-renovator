import {
  analysisQueue,
  renovationQueue,
  scrapeQueue,
  actionImageQueue,
  locationResearchQueue,
} from "../config/queue.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";

export async function enqueueAnalysis(
  analysisId: string,
  propertyId: string,
  userId: string,
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await analysisQueue.add("analyze", {
    analysisId,
    propertyId,
    userId,
    quality,
    size,
  }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function enqueueRenovation(
  renovationId: string,
  analysisPhotoId: string,
  userId: string,
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await renovationQueue.add("renovate", {
    renovationId,
    analysisPhotoId,
    userId,
    quality,
    size,
  }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function enqueueActionImage(
  journeyItemId: string,
  sourcePhotoId: string,
  userId: string,
  propertyId: string,
  actionItemTitle: string,
  room: string,
  styleDirection: string,
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await actionImageQueue.add("action-image", {
    journeyItemId,
    sourcePhotoId,
    userId,
    propertyId,
    actionItemTitle,
    room,
    styleDirection,
    quality,
    size,
  }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function enqueueScrape(
  scrapeJobId: string,
  propertyId: string,
  userId: string,
  url: string
): Promise<void> {
  await scrapeQueue.add("scrape", { scrapeJobId, propertyId, userId, url }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function enqueueLocationResearch(
  propertyId: string,
  userId: string
): Promise<void> {
  await locationResearchQueue.add("location-research", { propertyId, userId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}
