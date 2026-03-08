import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { TIER_LIMITS, PlatformError } from "@str-renovator/shared";
import { enqueueRenovation } from "../services/queue.service.js";
import * as storageService from "../services/storage.service.js";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as feedbackRepo from "../repositories/feedback.repository.js";

const router = Router();

const feedbackSchema = z.object({
  rating: z.enum(["like", "dislike"]),
  comment: z.string().optional(),
});

// GET /analysis-photos/:id/renovations - List renovations for an analysis_photo
router.get("/analysis-photos/:id/renovations", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const renovations = await renovationRepo.listByAnalysisPhoto(req.params.id, user.id);

    // Add signed URLs
    const withUrls = await Promise.all(
      renovations.map(async (r: any) => ({
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
    const renovation = await renovationRepo.findOwnershipCheck(req.params.id, user.id);

    if (!renovation) {
      throw PlatformError.notFound("Renovation", req.params.id);
    }

    const data = await feedbackRepo.create({
      renovation_id: req.params.id,
      user_id: user.id,
      rating: body.rating,
      comment: body.comment ?? null,
    });

    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
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
      const renovation = await renovationRepo.findByIdAndUser(req.params.id as string, user.id);

      if (!renovation) {
        res.status(404).json({ error: "Renovation not found" });
        return;
      }

      // Check rerun limit
      const count = await renovationRepo.countByAnalysisPhoto(renovation.analysis_photo_id);

      const limit = (req as any).tierLimit ?? TIER_LIMITS[user.tier].rerunsPerPhoto;
      if (count >= limit + 1) {
        // +1 for original
        throw PlatformError.tierLimitReached("reruns per photo", limit);
      }

      // Collect all feedback for renovations of this analysis_photo
      const renovationIds = await renovationRepo.listIdsByAnalysisPhoto(renovation.analysis_photo_id);

      const allFeedback = await feedbackRepo.listByRenovationIds(renovationIds);

      // Build feedback context
      const feedbackContext = allFeedback
        .map(
          (f: any) =>
            `[${f.rating}]${f.comment ? ` ${f.comment}` : ""}`
        )
        .join("\n");

      // Create new renovation
      const newRenovation = await renovationRepo.create({
        analysis_photo_id: renovation.analysis_photo_id,
        user_id: user.id,
        iteration: renovation.iteration + 1,
        parent_renovation_id: renovation.id,
        feedback_context: feedbackContext || null,
        status: "pending",
      });

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
