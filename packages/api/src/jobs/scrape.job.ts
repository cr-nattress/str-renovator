import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
import {
  scrapeListingPhotos,
  downloadImage,
} from "../services/scraper.service.js";
import { uploadPhoto } from "../services/storage.service.js";

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

  const updateJob = async (fields: Record<string, unknown>) => {
    await supabase
      .from("scrape_jobs")
      .update(fields)
      .eq("id", scrapeJobId);
  };

  try {
    // Phase 1: Scraping photo URLs
    await updateJob({ status: "scraping" });
    console.log(`[scrape] Scraping photos from ${url}`);

    const photos = await scrapeListingPhotos(url);

    if (photos.length === 0) {
      await updateJob({ status: "failed", error: "No photos found on page" });
      return;
    }

    await updateJob({ status: "downloading", total_photos: photos.length });
    console.log(`[scrape] Found ${photos.length} photos, downloading...`);

    // Phase 2: Download each photo and upload to storage
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

        // Create photo record in DB
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
        console.warn(
          `[scrape] Failed to download ${photo.url}:`,
          err instanceof Error ? err.message : err
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

    await updateJob({ status: "completed", downloaded_photos: downloaded });
    console.log(
      `[scrape] Completed: ${downloaded}/${photos.length} photos imported`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[scrape] Job failed:`, message);
    await updateJob({ status: "failed", error: message });
    throw err;
  }
}
