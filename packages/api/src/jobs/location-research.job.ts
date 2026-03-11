import type { Job } from "bullmq";
import { createChildLogger } from "../config/logger.js";
import { researchLocation } from "../skills/research-location/index.js";
import * as propertyRepo from "../repositories/property.repository.js";

interface LocationResearchJobData {
  propertyId: string;
  userId: string;
}

export async function processLocationResearchJob(
  job: Job<LocationResearchJobData>
): Promise<void> {
  const { propertyId, userId } = job.data;
  const log = createChildLogger({ jobType: "location-research", propertyId });

  try {
    const property = await propertyRepo.findByIdAndUser(propertyId, userId);

    if (!property) {
      throw new Error("Property not found");
    }

    const scrapedData = property.scraped_data as Record<string, unknown> | null;

    const { data: locationProfile, metadata } = await researchLocation({
      address_line1: property.address_line1 ?? undefined,
      address_line2: property.address_line2 ?? undefined,
      city: property.city ?? undefined,
      state: property.state ?? undefined,
      zip_code: property.zip_code ?? undefined,
      country: property.country ?? undefined,
      property_name: property.name ?? undefined,
      property_type: (scrapedData?.property_type as string) ?? undefined,
    });
    log.info({ model: metadata.model, tokensUsed: metadata.tokensUsed, promptVersion: metadata.promptVersion }, "location research AI metadata");

    await propertyRepo.updateById(propertyId, { location_profile: locationProfile });

    log.info("job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error({ err: message }, "job failed");
    throw err;
  }
}
