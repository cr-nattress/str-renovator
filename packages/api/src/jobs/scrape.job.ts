import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
import { createChildLogger } from "../config/logger.js";
import {
  scrapeListingPhotos,
  downloadImage,
} from "../services/scraper.service.js";
import { uploadPhoto } from "../services/storage.service.js";
import { extractListingData } from "../services/listing-extraction.service.js";
import { researchLocation } from "../services/location-research.service.js";
import { synthesizePropertyProfile } from "../services/property-synthesis.service.js";

interface ScrapeJobData {
  scrapeJobId: string;
  propertyId: string;
  userId: string;
  url: string;
}

export async function processScrapeJob(
  job: Job<ScrapeJobData>
): Promise<void> {
  const { scrapeJobId, propertyId, userId, url } = job.data;
  const log = createChildLogger({ jobType: "scrape", scrapeJobId, propertyId });

  const updateJob = async (fields: Record<string, unknown>) => {
    await supabase
      .from("scrape_jobs")
      .update(fields)
      .eq("id", scrapeJobId);
  };

  try {
    // Phase 1: Scraping photo URLs + page content
    await updateJob({ status: "scraping" });
    log.info({ url }, "scraping photos");

    const { photos, pageContent } = await scrapeListingPhotos(url);

    if (photos.length === 0) {
      await updateJob({ status: "failed", error: "No photos found on page" });
      return;
    }

    // Phase 2: Extract listing data via LLM
    await updateJob({ status: "extracting_data" });
    log.info("extracting listing data");

    try {
      const { data: scrapedData, metadata: extractionMeta } = await extractListingData(pageContent, url);
      log.info({ model: extractionMeta.model, tokensUsed: extractionMeta.tokensUsed, promptVersion: extractionMeta.promptVersion }, "listing extraction AI metadata");

      // Write scraped_data to property
      const propertyUpdate: Record<string, unknown> = {
        scraped_data: scrapedData,
      };

      // Fetch current property to check which fields are empty
      const { data: currentProperty } = await supabase
        .from("properties")
        .select("name, description, address_line1, address_line2, city, state, zip_code, country")
        .eq("id", propertyId)
        .single();

      // Auto-populate empty fields
      if (currentProperty) {
        if (!currentProperty.name && scrapedData.title) {
          propertyUpdate.name = scrapedData.title;
        }
        if (!currentProperty.description && scrapedData.description) {
          propertyUpdate.description = scrapedData.description;
        }
        if (!currentProperty.address_line1 && scrapedData.address_line1) {
          propertyUpdate.address_line1 = scrapedData.address_line1;
        }
        if (!currentProperty.address_line2 && scrapedData.address_line2) {
          propertyUpdate.address_line2 = scrapedData.address_line2;
        }
        if (!currentProperty.city && scrapedData.city) {
          propertyUpdate.city = scrapedData.city;
        }
        if (!currentProperty.state && scrapedData.state) {
          propertyUpdate.state = scrapedData.state;
        }
        if (!currentProperty.zip_code && scrapedData.zip_code) {
          propertyUpdate.zip_code = scrapedData.zip_code;
        }
        if (!currentProperty.country && scrapedData.country) {
          propertyUpdate.country = scrapedData.country;
        }
      }

      await supabase
        .from("properties")
        .update(propertyUpdate)
        .eq("id", propertyId);

      await updateJob({ data_extracted: true });
      log.info("listing data extracted");
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : err },
        "data extraction failed (non-fatal)"
      );
    }

    // Phase 3: Download photos
    await updateJob({ status: "downloading", total_photos: photos.length });
    log.info({ photoCount: photos.length }, "downloading photos");

    let downloaded = 0;
    for (const photo of photos) {
      try {
        const buffer = await downloadImage(photo.url);
        const storagePath = await uploadPhoto(
          buffer,
          userId,
          propertyId,
          photo.filename,
          "image/jpeg"
        );

        await supabase.from("photos").insert({
          property_id: propertyId,
          user_id: userId,
          filename: photo.filename,
          storage_path: storagePath,
          mime_type: "image/jpeg",
          source: "scrape",
        });

        downloaded++;
        await updateJob({ downloaded_photos: downloaded });
      } catch (err) {
        log.warn(
          { url: photo.url, err: err instanceof Error ? err.message : err },
          "photo download failed"
        );
      }
    }

    if (downloaded === 0) {
      await updateJob({
        status: "failed",
        error: "All photo downloads failed",
      });
      return;
    }

    // Phase 4: Research location
    await updateJob({ status: "researching_location" });
    log.info("researching location");

    try {
      // Fetch property with potentially updated address data
      const { data: prop } = await supabase
        .from("properties")
        .select("name, address_line1, address_line2, city, state, zip_code, country, scraped_data")
        .eq("id", propertyId)
        .single();

      const city = prop?.city || (prop?.scraped_data as Record<string, unknown>)?.city as string;
      const state = prop?.state || (prop?.scraped_data as Record<string, unknown>)?.state as string;

      if (city || state) {
        const { data: locationProfile, metadata: locationMeta } = await researchLocation({
          address_line1: prop?.address_line1 ?? undefined,
          address_line2: prop?.address_line2 ?? undefined,
          city: city ?? undefined,
          state: state ?? undefined,
          zip_code: prop?.zip_code ?? undefined,
          country: prop?.country ?? undefined,
          property_name: prop?.name ?? undefined,
          property_type: (prop?.scraped_data as Record<string, unknown>)?.property_type as string | undefined,
        });
        log.info({ model: locationMeta.model, tokensUsed: locationMeta.tokensUsed, promptVersion: locationMeta.promptVersion }, "location research AI metadata");

        await supabase
          .from("properties")
          .update({ location_profile: locationProfile })
          .eq("id", propertyId);

        await updateJob({ location_researched: true });
        log.info("location research completed");
      } else {
        log.info("no city/state available, skipping location research");
      }
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : err },
        "location research failed (non-fatal)"
      );
    }

    // Phase 5: Synthesize property profile from scraped data + location profile
    await updateJob({ status: "synthesizing" });
    log.info("synthesizing property profile");

    try {
      const { data: propForSynthesis } = await supabase
        .from("properties")
        .select("name, scraped_data, location_profile")
        .eq("id", propertyId)
        .single();

      const scrapedData = propForSynthesis?.scraped_data as Record<string, unknown> | null;
      const locationProfile = propForSynthesis?.location_profile as Record<string, unknown> | null;

      if (scrapedData && locationProfile) {
        const { data: propertyProfile, metadata: synthesisMeta } = await synthesizePropertyProfile({
          scrapedData,
          locationProfile,
          propertyName: propForSynthesis?.name ?? undefined,
        });
        log.info({ model: synthesisMeta.model, tokensUsed: synthesisMeta.tokensUsed, promptVersion: synthesisMeta.promptVersion }, "property synthesis AI metadata");

        await supabase
          .from("properties")
          .update({ property_profile: propertyProfile })
          .eq("id", propertyId);

        log.info("property profile synthesized");
      } else {
        log.info("missing scraped_data or location_profile, skipping synthesis");
      }
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : err },
        "property synthesis failed (non-fatal)"
      );
    }

    await updateJob({ status: "completed", downloaded_photos: downloaded });
    log.info({ downloaded, total: photos.length }, "scrape completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error({ err: message }, "job failed");
    await updateJob({ status: "failed", error: message });
    throw err;
  }
}
