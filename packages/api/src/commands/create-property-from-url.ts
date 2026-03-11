/**
 * @module create-property-from-url
 * @capability CreatePropertyFromUrl command handler
 * @layer Orchestration
 *
 * Creates a new property from a listing URL, then immediately dispatches
 * a scrape job to extract details. Combines CreateProperty + ScrapePropertyListing
 * into a single atomic operation for the intent-based onboarding flow.
 *
 * @see packages/api/src/commands/create-property.ts
 * @see packages/api/src/commands/scrape-property-listing.ts
 */

import type { DbProperty, PropertyCreatedEvent, ScrapeSubmittedEvent } from "@str-renovator/shared";
import { createProperty } from "./create-property.js";
import { scrapePropertyListing } from "./scrape-property-listing.js";
import type { CommandContext, CommandResult } from "./execute.js";

export interface CreatePropertyFromUrlInput {
  listingUrl: string;
}

function extractNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host.includes("airbnb")) {
      const roomId = parsed.pathname.match(/\/rooms\/(\d+)/)?.[1];
      return roomId ? `Airbnb Listing ${roomId}` : "Airbnb Listing";
    }
    if (host.includes("vrbo")) {
      const listingId = parsed.pathname.match(/\/(\d+)/)?.[1];
      return listingId ? `VRBO Listing ${listingId}` : "VRBO Listing";
    }
    if (host.includes("booking.com")) {
      return "Booking.com Listing";
    }
    return `Listing from ${host}`;
  } catch {
    return "Imported Listing";
  }
}

export async function createPropertyFromUrl(
  input: CreatePropertyFromUrlInput,
  ctx: CommandContext,
): Promise<CommandResult<{ property: DbProperty; scrape_job_id: string }>> {
  const name = extractNameFromUrl(input.listingUrl);

  const propertyResult = await createProperty(
    { name, listing_url: input.listingUrl },
    ctx,
  );

  const scrapeResult = await scrapePropertyListing(
    { propertyId: propertyResult.data.id, listing_url: input.listingUrl },
    ctx,
  );

  const events = [
    ...propertyResult.events,
    ...scrapeResult.events,
  ];

  return {
    data: {
      property: propertyResult.data,
      scrape_job_id: scrapeResult.data.scrape_job_id,
    },
    events,
    availableActions: [
      {
        label: "Stream Scrape Progress",
        command: "StreamScrapeJob",
        params: { scrapeJobId: scrapeResult.data.scrape_job_id },
      },
      {
        label: "View Property",
        command: "ViewProperty",
        params: { propertyId: propertyResult.data.id },
      },
    ],
  };
}
