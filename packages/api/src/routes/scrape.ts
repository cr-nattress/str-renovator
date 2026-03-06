import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { enqueueScrape } from "../services/queue.service.js";
import { supabase } from "../config/supabase.js";

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
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("user_id", user.id)
        .single();

      if (!property) {
        res.status(404).json({ error: "Property not found" });
        return;
      }

      // Create scrape_jobs row
      const { data: scrapeJob, error } = await supabase
        .from("scrape_jobs")
        .insert({
          property_id: propertyId,
          user_id: user.id,
          listing_url: body.listing_url,
          status: "pending",
        })
        .select()
        .single();

      if (error || !scrapeJob) {
        res.status(500).json({ error: "Failed to create scrape job" });
        return;
      }

      await enqueueScrape(scrapeJob.id, propertyId, user.id, body.listing_url);

      res.status(202).json({ scrape_job_id: scrapeJob.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
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

    const { data: job, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      res.status(404).json({ error: "Scrape job not found" });
      return;
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

    const { data: jobs, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      res.status(500).json({ error: "Failed to fetch scrape jobs" });
      return;
    }

    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

export default router;
