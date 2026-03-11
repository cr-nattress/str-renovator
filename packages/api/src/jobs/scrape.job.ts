import type { Job } from "bullmq";
import { createChildLogger } from "../config/logger.js";
import { serializeError } from "../config/errors.js";
import {
  scrapeListingPhotos,
  scrapeListingReviews,
  downloadImage,
} from "../services/scraper.service.js";
import { uploadPhoto } from "../services/storage.service.js";
import { extractListingData } from "../skills/extract-listing-data/index.js";
import { analyzeReviews } from "../skills/analyze-reviews/index.js";
import { researchLocation } from "../skills/research-location/index.js";
import { synthesizePropertyProfile } from "../skills/synthesize-property-profile/index.js";
import * as scrapeJobRepo from "../repositories/scrape-job.repository.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";

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

  try {
    // Phase 1: Scraping photo URLs + page content
    await scrapeJobRepo.updateStatus(scrapeJobId, "scraping");
    log.info({ url }, "scraping photos");

    const { photos, pageContent } = await scrapeListingPhotos(url);

    if (photos.length === 0) {
      await scrapeJobRepo.updateStatus(scrapeJobId, "failed", { error: "No photos found on page" });
      return;
    }

    // Phase 2: Extract listing data via LLM
    await scrapeJobRepo.updateStatus(scrapeJobId, "extracting_data");
    log.info("extracting listing data");

    // Fetch current property once — reused by Phase 2 (field population) and Phase 2.5 (review analysis)
    const currentProperty = await propertyRepo.findById(propertyId);

    try {
      const { data: scrapedData, metadata: extractionMeta } = await extractListingData(pageContent, url);
      log.info({ model: extractionMeta.model, tokensUsed: extractionMeta.tokensUsed, promptVersion: extractionMeta.promptVersion }, "listing extraction AI metadata");

      // Write scraped_data to property
      const propertyUpdate: Record<string, unknown> = {
        scraped_data: scrapedData,
      };

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

      await propertyRepo.updateById(propertyId, propertyUpdate);

      await scrapeJobRepo.updateFields(scrapeJobId, { data_extracted: true });
      log.info("listing data extracted");
    } catch (err) {
      log.warn(
        { err: serializeError(err) },
        "data extraction failed (non-fatal)"
      );
    }

    // Phase 2.5: Scrape and analyze guest reviews (Airbnb only)
    if (url.includes("airbnb")) {
      try {
        await scrapeJobRepo.updateStatus(scrapeJobId, "analyzing_reviews");
        log.info("scraping guest reviews");

        const { reviewContent, reviewCount } = await scrapeListingReviews(url);

        if (reviewContent.length > 0) {
          log.info({ reviewCount }, "reviews scraped, analyzing");

          const { data: reviewData, metadata: reviewMeta } = await analyzeReviews(
            reviewContent,
            currentProperty?.name ?? undefined
          );
          log.info({ model: reviewMeta.model, tokensUsed: reviewMeta.tokensUsed, promptVersion: reviewMeta.promptVersion }, "review analysis AI metadata");

          await propertyRepo.updateById(propertyId, { review_analysis: reviewData });
          await scrapeJobRepo.updateFields(scrapeJobId, { reviews_analyzed: true });
          log.info("review analysis completed");
        } else {
          log.info("no reviews found on listing page");
        }
      } catch (err) {
        log.warn(
          { err: serializeError(err) },
          "review analysis failed (non-fatal)"
        );
      }
    }

    // Phase 3: Download photos
    await scrapeJobRepo.updateStatus(scrapeJobId, "downloading", { total_photos: photos.length });
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

        await photoRepo.create({
          property_id: propertyId,
          user_id: userId,
          filename: photo.filename,
          storage_path: storagePath,
          mime_type: "image/jpeg",
          source: "scrape",
        });

        downloaded++;
        await scrapeJobRepo.updateFields(scrapeJobId, { downloaded_photos: downloaded });
      } catch (err) {
        log.warn(
          { url: photo.url, err: serializeError(err) },
          "photo download failed"
        );
      }
    }

    if (downloaded === 0) {
      await scrapeJobRepo.updateStatus(scrapeJobId, "failed", {
        error: "All photo downloads failed",
      });
      return;
    }

    // Phase 4: Research location
    await scrapeJobRepo.updateStatus(scrapeJobId, "researching_location");
    log.info("researching location");

    try {
      // Fetch property with potentially updated address data
      const prop = await propertyRepo.findById(propertyId);

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

        await propertyRepo.updateById(propertyId, { location_profile: locationProfile });

        await scrapeJobRepo.updateFields(scrapeJobId, { location_researched: true });
        log.info("location research completed");
      } else {
        log.info("no city/state available, skipping location research");
      }
    } catch (err) {
      log.warn(
        { err: serializeError(err) },
        "location research failed (non-fatal)"
      );
    }

    // Phase 5: Synthesize property profile from scraped data + location profile
    await scrapeJobRepo.updateStatus(scrapeJobId, "synthesizing");
    log.info("synthesizing property profile");

    try {
      const propForSynthesis = await propertyRepo.findById(propertyId);

      const scrapedData = propForSynthesis?.scraped_data as Record<string, unknown> | null;
      const locationProfile = propForSynthesis?.location_profile as Record<string, unknown> | null;
      const reviewAnalysis = propForSynthesis?.review_analysis as Record<string, unknown> | null;

      if (scrapedData && locationProfile) {
        const { data: propertyProfile, metadata: synthesisMeta } = await synthesizePropertyProfile({
          scrapedData,
          locationProfile,
          propertyName: propForSynthesis?.name ?? undefined,
          reviewAnalysis: reviewAnalysis ?? undefined,
        });
        log.info({ model: synthesisMeta.model, tokensUsed: synthesisMeta.tokensUsed, promptVersion: synthesisMeta.promptVersion }, "property synthesis AI metadata");

        await propertyRepo.updateById(propertyId, { property_profile: propertyProfile });

        log.info("property profile synthesized");
      } else {
        log.info("missing scraped_data or location_profile, skipping synthesis");
      }
    } catch (err) {
      log.warn(
        { err: serializeError(err) },
        "property synthesis failed (non-fatal)"
      );
    }

    await scrapeJobRepo.updateStatus(scrapeJobId, "completed", { downloaded_photos: downloaded });
    log.info({ downloaded, total: photos.length }, "scrape completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error({ err: message }, "job failed");
    await scrapeJobRepo.updateStatus(scrapeJobId, "failed", { error: message });
    throw err;
  }
}
