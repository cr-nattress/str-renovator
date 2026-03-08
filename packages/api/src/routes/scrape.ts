import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { PlatformError } from "@str-renovator/shared";
import { enqueueScrape, enqueueLocationResearch } from "../services/queue.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as scrapeJobRepo from "../repositories/scrape-job.repository.js";

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
      const user = req.dbUser!;
      const propertyId = req.params.propertyId as string;
      const body = scrapeSchema.parse(req.body);

      // Verify ownership
      const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

      if (!property) {
        throw PlatformError.notFound("Property", propertyId);
      }

      // Create scrape_jobs row
      const scrapeJob = await scrapeJobRepo.create({
        property_id: propertyId,
        user_id: user.id,
        listing_url: body.listing_url,
        status: "pending",
      });

      await enqueueScrape(scrapeJob.id as string, propertyId, user.id, body.listing_url);

      res.status(202).json({ scrape_job_id: scrapeJob.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
      }
      next(err);
    }
  }
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

// POST /properties/:propertyId/research-location - Start location research
router.post(
  "/properties/:propertyId/research-location",
  async (req, res, next) => {
    try {
      const user = req.dbUser!;
      const propertyId = req.params.propertyId as string;

      // Verify ownership and check city/state
      const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id, city, state");

      if (!property) {
        throw PlatformError.notFound("Property", propertyId);
      }

      if (!property.city && !property.state) {
        throw PlatformError.validationError("Property must have a city or state to research location");
      }

      await enqueueLocationResearch(propertyId, user.id);

      res.status(202).json({ status: "queued" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
