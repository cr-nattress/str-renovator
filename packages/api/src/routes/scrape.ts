import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { PlatformError } from "@str-renovator/shared";
import type { StreamEvent } from "@str-renovator/shared";
import * as scrapeJobRepo from "../repositories/scrape-job.repository.js";
import { createSSEStream } from "../streams/create-sse-stream.js";
import {
  scrapePropertyListing,
  researchPropertyLocation,
} from "../commands/index.js";

const router = Router();

const scrapeSchema = z.object({
  listing_url: z.string().url(),
});

// POST /properties/:propertyId/scrape - Start scrape job
router.post(
  "/properties/:propertyId/scrape",
  checkTierLimit("urlScraping"),
  async (req, res, next) => {
    try {
      const body = scrapeSchema.parse(req.body);
      const result = await scrapePropertyListing(
        {
          propertyId: req.params.propertyId as string,
          listing_url: body.listing_url,
        },
        {
          userId: req.dbUser!.id,
          user: req.dbUser!,
          tierLimit: req.tierLimit,
        },
      );
      res.status(202).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
      }
      next(err);
    }
  },
);

// GET /scrape-jobs/:id - Poll scrape job status
router.get("/scrape-jobs/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const jobId = req.params.id as string;

    const job = await scrapeJobRepo.findByIdAndUser(jobId, user.id);

    if (!job) {
      throw PlatformError.notFound("Scrape job", jobId);
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// GET /properties/:propertyId/scrape-jobs - List scrape jobs for a property
router.get("/properties/:propertyId/scrape-jobs", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const propertyId = req.params.propertyId as string;

    const jobs = await scrapeJobRepo.listByProperty(propertyId, user.id);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// GET /scrape-jobs/:id/stream - SSE endpoint for scrape progress
const SCRAPE_STATUS_MESSAGES: Record<string, string> = {
  pending: "Preparing...",
  scraping: "Extracting photos and page content...",
  extracting_data: "AI is analyzing the listing data...",
  analyzing_reviews: "Analyzing guest reviews...",
  downloading: "Downloading photos...",
  researching_location: "Researching the local market...",
  synthesizing: "Building property intelligence profile...",
};

type ScrapeStreamData = Awaited<ReturnType<typeof scrapeJobRepo.getStreamData>>;

router.get("/scrape-jobs/:id/stream", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const jobId = req.params.id as string;

    // Verify ownership
    const job = await scrapeJobRepo.findByIdAndUser(jobId, user.id);
    if (!job) {
      throw PlatformError.notFound("Scrape job", jobId);
    }

    createSSEStream<NonNullable<ScrapeStreamData>, StreamEvent>(req, res, {
      pollFn: () => scrapeJobRepo.getStreamData(jobId),
      isTerminal: (data) => data.status === "completed" || data.status === "failed",
      mapToEvents: (data, prev) => {
        const events: StreamEvent[] = [];

        if (data.status !== prev?.status) {
          events.push({
            type: "status",
            status: data.status,
            message: SCRAPE_STATUS_MESSAGES[data.status],
          });
        }

        if (
          data.status === "downloading" &&
          data.total_photos > 0 &&
          data.downloaded_photos !== prev?.downloaded_photos
        ) {
          events.push({
            type: "progress",
            completed: data.downloaded_photos,
            total: data.total_photos,
            message: `Downloading photos... (${data.downloaded_photos}/${data.total_photos})`,
          });
        }

        if (data.status === "completed") {
          events.push({ type: "done", message: "Import complete!" });
        } else if (data.status === "failed") {
          events.push({ type: "error", message: data.error ?? "Scrape failed" });
        }

        return events;
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /properties/:propertyId/research-location - Start location research
router.post(
  "/properties/:propertyId/research-location",
  async (req, res, next) => {
    try {
      const result = await researchPropertyLocation(
        { propertyId: req.params.propertyId as string },
        { userId: req.dbUser!.id, user: req.dbUser! },
      );
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
