import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { checkTierLimit } from "../middleware/tier.js";
import { TIER_LIMITS } from "@str-renovator/shared";
import { enqueueAnalysis } from "../services/queue.service.js";
import * as storageService from "../services/storage.service.js";
import type { SSEEvent, AnalysisStatus } from "@str-renovator/shared";

const router = Router();

// POST /properties/:propertyId/analyses - Start analysis
router.post(
  "/properties/:propertyId/analyses",
  checkTierLimit("analysesPerMonth"),
  async (req, res, next) => {
    try {
      const user = req.dbUser!;
      const propertyId = req.params.propertyId as string;

      // Verify property ownership
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

      // Check monthly limit
      const limit = TIER_LIMITS[user.tier].analysesPerMonth;
      if (user.analyses_this_month >= limit) {
        res.status(403).json({
          error: `Monthly analysis limit (${limit}) reached for your ${user.tier} plan`,
        });
        return;
      }

      // Count photos
      const { count: photoCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId);

      if (!photoCount || photoCount === 0) {
        res.status(400).json({ error: "No photos uploaded for this property" });
        return;
      }

      const quality = req.body.quality ?? TIER_LIMITS[user.tier].imageQuality;
      const size = req.body.size ?? "auto";

      // Create analysis row
      const { data: analysis, error } = await supabase
        .from("analyses")
        .insert({
          property_id: propertyId,
          user_id: user.id,
          status: "pending",
          total_photos: photoCount,
        })
        .select()
        .single();

      if (error || !analysis) throw error ?? new Error("Failed to create analysis");

      // Enqueue job
      await enqueueAnalysis(analysis.id, propertyId, user.id, quality, size);

      // Increment analyses_this_month
      await supabase
        .from("users")
        .update({ analyses_this_month: user.analyses_this_month + 1 })
        .eq("id", user.id);

      res.status(202).json({ id: analysis.id, status: analysis.status });
    } catch (err) {
      next(err);
    }
  }
);

// GET /properties/:propertyId/analyses - List analyses for a property
router.get("/properties/:propertyId/analyses", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const propertyId = req.params.propertyId as string;

    const { data: analyses, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(analyses ?? []);
  } catch (err) {
    next(err);
  }
});

// GET /analyses/:id - Get analysis with nested analysis_photos
router.get("/analyses/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const { data: analysis, error } = await supabase
      .from("analyses")
      .select("*, analysis_photos(*, photos(*))")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    // Add signed URLs for photos
    const analysisPhotos = analysis.analysis_photos ?? [];
    for (const ap of analysisPhotos as any[]) {
      if (ap.photos?.storage_path) {
        ap.photos.url = await storageService.getSignedUrl(
          ap.photos.storage_path
        );
      }
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// GET /analyses/:id/stream - SSE endpoint
router.get("/analyses/:id/stream", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    // Verify ownership
    const { data: analysis } = await supabase
      .from("analyses")
      .select("id, user_id")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

    if (!analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: SSEEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let lastStatus: string | null = null;
    let lastCompleted = -1;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("analyses")
          .select("status, completed_photos, total_photos, error")
          .eq("id", req.params.id)
          .single();

        if (!data) {
          sendEvent({ type: "error", message: "Analysis not found" });
          clearInterval(interval);
          res.end();
          return;
        }

        // Send status change
        if (data.status !== lastStatus) {
          lastStatus = data.status;
          sendEvent({ type: "status", status: data.status as AnalysisStatus });
        }

        // Send progress update
        if (data.completed_photos !== lastCompleted) {
          lastCompleted = data.completed_photos;
          sendEvent({
            type: "progress",
            completed: data.completed_photos,
            total: data.total_photos,
          });
        }

        // End on terminal states
        if (data.status === "completed") {
          sendEvent({ type: "done" });
          clearInterval(interval);
          res.end();
        } else if (data.status === "failed") {
          sendEvent({ type: "error", message: data.error ?? "Analysis failed" });
          clearInterval(interval);
          res.end();
        }
      } catch {
        clearInterval(interval);
        res.end();
      }
    }, 2000);

    // Clean up on client disconnect
    req.on("close", () => {
      clearInterval(interval);
    });
  } catch (err) {
    next(err);
  }
});

export default router;
