import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { PlatformError, TIER_LIMITS } from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as renovationRepo from "../repositories/renovation.repository.js";
import * as analysisPhotoRepo from "../repositories/analysis-photo.repository.js";
import * as feedbackRepo from "../repositories/feedback.repository.js";
import {
  submitRenovationFeedback,
  rerunRenovation,
} from "../commands/index.js";
import { computeRenovationActions } from "../actions/index.js";

const router = Router();

const feedbackSchema = z.object({
  rating: z.enum(["like", "dislike"]),
  comment: z.string().optional(),
});

// GET /analysis-photos/:id/renovations - Get analysis photo with nested renovations
router.get("/analysis-photos/:id/renovations", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    // Fetch the analysis photo with its linked photo record
    const analysisPhoto = await analysisPhotoRepo.findByIdWithPhoto(req.params.id);
    if (!analysisPhoto) {
      throw PlatformError.notFound("AnalysisPhoto", req.params.id);
    }

    // Add signed URL for the original photo
    const photoUrl = await storageService.getSignedUrlOrNull(analysisPhoto.photos.storage_path);
    const photoWithUrl = { ...analysisPhoto.photos, url: photoUrl };

    // Fetch renovations and add signed URLs
    const renovations = await renovationRepo.listByAnalysisPhoto(req.params.id, user.id);
    const renovationImages = await Promise.all(
      renovations.map(async (r: any) => ({
        ...r,
        url: await storageService.getSignedUrlOrNull(r.storage_path),
      }))
    );

    // Compute available actions based on renovation state
    const latestRenovation = renovationImages.length > 0
      ? renovationImages.reduce((a: any, b: any) => a.iteration > b.iteration ? a : b)
      : null;

    let hasLatestFeedback = false;
    if (latestRenovation) {
      const feedbacks = await feedbackRepo.listByRenovationIds([latestRenovation.id]);
      hasLatestFeedback = feedbacks.length > 0;
    }

    const rerunLimit = TIER_LIMITS[user.tier].rerunsPerPhoto;
    const availableActions = computeRenovationActions({
      latestRenovationId: latestRenovation?.id ?? null,
      iterationCount: renovationImages.length,
      rerunLimit,
      hasLatestFeedback,
    });

    // Return AnalysisPhotoWithDetails shape
    const { photos: _photos, ...analysisPhotoFields } = analysisPhoto;
    res.json({
      ...analysisPhotoFields,
      photo: photoWithUrl,
      renovation_images: renovationImages,
      availableActions,
    });
  } catch (err) {
    next(err);
  }
});

// POST /renovations/:id/feedback - Submit feedback
router.post("/renovations/:id/feedback", async (req, res, next) => {
  try {
    const body = feedbackSchema.parse(req.body);
    const result = await submitRenovationFeedback(
      { renovationId: req.params.id, rating: body.rating, comment: body.comment },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.status(201).json(result);
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
      const result = await rerunRenovation(
        {
          renovationId: req.params.id as string,
          quality: req.body.quality,
          size: req.body.size,
        },
        {
          userId: req.dbUser!.id,
          user: req.dbUser!,
          tierLimit: req.tierLimit,
        },
      );
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
