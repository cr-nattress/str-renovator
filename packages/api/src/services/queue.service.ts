/**
 * @module queue.service
 * @capability Typed job enqueue operations
 * @layer Execution
 *
 * Provides domain-specific typed enqueue functions by delegating to the
 * QueueConnector abstraction. Keeps the typed signatures consumers rely on
 * while the underlying queue implementation is swappable.
 *
 * @see connectors/queue.connector.ts — interface
 * @see connectors/bullmq.connector.ts — implementation
 */

import { bullMqConnector } from "../connectors/bullmq.connector.js";
import type { ImageQuality, ImageSize } from "@str-renovator/shared";

const DEFAULT_RETRY = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 10000 },
};

export async function enqueueAnalysis(
  analysisId: string,
  propertyId: string,
  userId: string,
  quality: ImageQuality,
  size: ImageSize,
  retry?: boolean
): Promise<void> {
  await bullMqConnector.enqueue(
    "analysis",
    "analyze",
    { analysisId, propertyId, userId, quality, size, retry: retry ?? false },
    DEFAULT_RETRY
  );
}

export async function enqueueRenovation(
  renovationId: string,
  analysisPhotoId: string,
  userId: string,
  quality: ImageQuality,
  size: ImageSize
): Promise<void> {
  await bullMqConnector.enqueue(
    "renovation",
    "renovate",
    { renovationId, analysisPhotoId, userId, quality, size },
    DEFAULT_RETRY
  );
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
  await bullMqConnector.enqueue(
    "action-image",
    "action-image",
    {
      journeyItemId,
      sourcePhotoId,
      userId,
      propertyId,
      actionItemTitle,
      room,
      styleDirection,
      quality,
      size,
    },
    DEFAULT_RETRY
  );
}

export async function enqueueScrape(
  scrapeJobId: string,
  propertyId: string,
  userId: string,
  url: string
): Promise<void> {
  await bullMqConnector.enqueue(
    "scrape",
    "scrape",
    { scrapeJobId, propertyId, userId, url },
    DEFAULT_RETRY
  );
}

export async function enqueueLocationResearch(
  propertyId: string,
  userId: string
): Promise<void> {
  await bullMqConnector.enqueue(
    "location-research",
    "location-research",
    { propertyId, userId },
    DEFAULT_RETRY
  );
}
