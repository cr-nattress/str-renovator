import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { checkTierLimit } from "../middleware/tier.js";
import { TIER_LIMITS } from "@str-renovator/shared";
import { enqueueRenovation } from "../services/queue.service.js";
import * as storageService from "../services/storage.service.js";

const router = Router();

const feedbackSchema = z.object({
  rating: z.enum(["like", "dislike"]),
  comment: z.string().optional(),
});

// GET /analysis-photos/:id/renovations - List renovations for an analysis_photo
router.get("/analysis-photos/:id/renovations", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const { data: renovations, error } = await supabase
      .from("renovations")
      .select("*")
      .eq("analysis_photo_id", req.params.id)
      .eq("user_id", user.id)
      .order("iteration", { ascending: true });

    if (error) throw error;

    // Add signed URLs
    const withUrls = await Promise.all(
      (renovations ?? []).map(async (r: any) => ({
        ...r,
        url: r.storage_path
          ? await storageService.getSignedUrl(r.storage_path)
          : null,
      }))
    );

    res.json(withUrls);
  } catch (err) {
    next(err);
  }
});

// POST /renovations/:id/feedback - Submit feedback
router.post("/renovations/:id/feedback", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const body = feedbackSchema.parse(req.body);

    // Verify ownership
    const { data: renovation } = await supabase
      .from("renovations")
      .select("id, user_id")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

    if (!renovation) {
      res.status(404).json({ error: "Renovation not found" });
      return;
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        renovation_id: req.params.id,
        user_id: user.id,
        rating: body.rating,
        comment: body.comment ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    next(err);
  }
});

// POST /renovations/:id/rerun - Re-run renovation with feedback
router.post(
  "/renovations/:id/rerun",
  checkTierLimit("rerunsPerPhoto"),
  async (req, res, next) => {
    try {
      const user = req.dbUser!;

      // Get the original renovation
      const { data: renovation } = await supabase
        .from("renovations")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", user.id)
        .single();

      if (!renovation) {
        res.status(404).json({ error: "Renovation not found" });
        return;
      }

      // Check rerun limit
      const { count } = await supabase
        .from("renovations")
        .select("*", { count: "exact", head: true })
        .eq("analysis_photo_id", renovation.analysis_photo_id);

      const limit = TIER_LIMITS[user.tier].rerunsPerPhoto;
      if ((count ?? 0) >= limit + 1) {
        // +1 for original
        res.status(403).json({
          error: `Rerun limit (${limit}) reached for your ${user.tier} plan`,
        });
        return;
      }

      // Collect all feedback for renovations of this analysis_photo
      const { data: allRenovations } = await supabase
        .from("renovations")
        .select("id")
        .eq("analysis_photo_id", renovation.analysis_photo_id);

      const renovationIds = (allRenovations ?? []).map((r: any) => r.id);

      const { data: allFeedback } = await supabase
        .from("feedback")
        .select("*")
        .in("renovation_id", renovationIds)
        .order("created_at", { ascending: true });

      // Build feedback context
      const feedbackContext = (allFeedback ?? [])
        .map(
          (f: any) =>
            `[${f.rating}]${f.comment ? ` ${f.comment}` : ""}`
        )
        .join("\n");

      // Create new renovation
      const { data: newRenovation, error } = await supabase
        .from("renovations")
        .insert({
          analysis_photo_id: renovation.analysis_photo_id,
          user_id: user.id,
          iteration: renovation.iteration + 1,
          parent_renovation_id: renovation.id,
          feedback_context: feedbackContext || null,
          status: "pending",
        })
        .select()
        .single();

      if (error || !newRenovation) throw error ?? new Error("Failed to create renovation");

      const quality = req.body.quality ?? TIER_LIMITS[user.tier].imageQuality;
      const size = req.body.size ?? "auto";

      await enqueueRenovation(
        newRenovation.id,
        renovation.analysis_photo_id,
        user.id,
        quality,
        size
      );

      res.status(202).json({ id: newRenovation.id, status: newRenovation.status });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
