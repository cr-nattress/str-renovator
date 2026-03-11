/**
 * @module scrape-property-listing
 * @capability ScrapePropertyListing command handler
 * @layer Orchestration
 *
 * Starts a background scrape of a property's listing URL. Creates a
 * scrape_jobs row and enqueues a BullMQ job for async processing.
 *
 * @see packages/shared/src/manifests/commands.ts — ScrapePropertyListing
 */

import { PlatformError } from "@str-renovator/shared";
import type { ScrapeSubmittedEvent } from "@str-renovator/shared";
import { enqueueScrape } from "../services/queue.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as scrapeJobRepo from "../repositories/scrape-job.repository.js";
import { publishEvents } from "../events/event-bus.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface ScrapePropertyListingInput {
  propertyId: string;
  listing_url: string;
}

export async function scrapePropertyListing(
  input: ScrapePropertyListingInput,
  ctx: CommandContext,
): Promise<CommandResult<{ scrape_job_id: string }>> {
  const { propertyId, listing_url } = input;

  // Verify ownership
  const property = await propertyRepo.findByIdWithColumns(propertyId, ctx.userId, "id");
  if (!property) {
    throw PlatformError.notFound("Property", propertyId);
  }

  // Create scrape_jobs row
  const scrapeJob = await scrapeJobRepo.create({
    property_id: propertyId,
    user_id: ctx.userId,
    listing_url,
    status: "pending",
  });

  await enqueueScrape(scrapeJob.id as string, propertyId, ctx.userId, listing_url);

  const events: ScrapeSubmittedEvent[] = [
    {
      type: "ScrapeSubmitted",
      entityId: scrapeJob.id as string,
      entityType: "ScrapeJob",
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      data: { scrapeJobId: scrapeJob.id as string, propertyId, userId: ctx.userId, listingUrl: listing_url },
    },
  ];
  await publishEvents(events);

  return {
    data: { scrape_job_id: scrapeJob.id as string },
    events,
    availableActions: [
      {
        label: "Stream Scrape Progress",
        command: "StreamScrapeJob",
        params: { scrapeJobId: scrapeJob.id },
      },
    ],
  };
}
