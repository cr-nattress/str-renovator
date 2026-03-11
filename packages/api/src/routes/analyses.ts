import { Router } from "express";
import { checkTierLimit } from "../middleware/tier.js";
import { PlatformError } from "@str-renovator/shared";
import type { SSEEvent, AnalysisStatus } from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import { logger } from "../config/logger.js";
import { createSSEStream } from "../streams/create-sse-stream.js";
import {
  submitAnalysis,
  editAnalysisFields,
  archiveAnalysis,
} from "../commands/index.js";
import { computeAnalysisActions } from "../actions/index.js";

const router = Router();

// POST /properties/:propertyId/analyses - Start analysis
router.post(
  "/properties/:propertyId/analyses",
  checkTierLimit("analysesPerMonth"),
  async (req, res, next) => {
    try {
      const result = await submitAnalysis(
        {
          propertyId: req.params.propertyId as string,
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

// GET /properties/:propertyId/analyses - List analyses for a property
router.get("/properties/:propertyId/analyses", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const propertyId = req.params.propertyId as string;

    const analyses = await analysisRepo.listByPropertyAndUser(propertyId, user.id);
    res.json(analyses);
  } catch (err) {
    next(err);
  }
});

// GET /analyses/:id - Get analysis with nested analysis_photos
router.get("/analyses/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const analysis = await analysisRepo.findByIdWithPhotos(req.params.id, user.id);

    if (!analysis) {
      throw PlatformError.notFound("Analysis", req.params.id);
    }

    // Add signed URLs for photos — skip individual failures so one
    // missing storage object doesn't crash the entire response
    const analysisPhotos = analysis.analysis_photos ?? [];
    for (const ap of analysisPhotos as any[]) {
      if (!ap.photos) {
        logger.warn(
          { analysisId: req.params.id, analysisPhotoId: ap.id, photoId: ap.photo_id, room: ap.room },
          "analysis photo has no joined photos record — photo may have been deleted"
        );
        continue;
      }
      if (!ap.photos.storage_path) {
        logger.warn(
          { analysisId: req.params.id, photoId: ap.photos.id, filename: ap.photos.filename },
          "photo record has no storage_path"
        );
        ap.photos.url = null;
        continue;
      }
      ap.photos.url = await storageService.getSignedUrlOrNull(ap.photos.storage_path);
    }

    logger.info(
      {
        analysisId: req.params.id,
        totalAnalysisPhotos: analysisPhotos.length,
        withUrls: analysisPhotos.filter((ap: any) => ap.photos?.url).length,
        withoutPhotos: analysisPhotos.filter((ap: any) => !ap.photos).length,
        withoutUrls: analysisPhotos.filter((ap: any) => ap.photos && !ap.photos.url).length,
        rooms: analysisPhotos.map((ap: any) => ({ room: ap.room, hasPhoto: !!ap.photos, hasUrl: !!ap.photos?.url })),
      },
      "analysis photos URL resolution summary"
    );

    const availableActions = computeAnalysisActions(analysis);
    res.json({ ...analysis, availableActions });
  } catch (err) {
    next(err);
  }
});

// GET /analyses/:id/stream - SSE endpoint
type AnalysisStreamData = NonNullable<Awaited<ReturnType<typeof analysisRepo.getStreamData>>>;

router.get("/analyses/:id/stream", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    // Verify ownership
    const analysis = await analysisRepo.findOwnershipCheck(req.params.id, user.id);

    if (!analysis) {
      throw PlatformError.notFound("Analysis", req.params.id);
    }

    const analysisId = req.params.id;

    createSSEStream<AnalysisStreamData, SSEEvent>(req, res, {
      pollFn: () => analysisRepo.getStreamData(analysisId),
      isTerminal: (data) =>
        data.status === "completed" ||
        data.status === "partially_completed" ||
        data.status === "failed",
      mapToEvents: (data, prev) => {
        const events: SSEEvent[] = [];

        // Send status change
        if (data.status !== prev?.status) {
          events.push({ type: "status", status: data.status as AnalysisStatus });
        }

        // Send batch progress updates
        const prevCompletedBatches = prev?.completed_batches ?? -1;
        const prevFailedBatches = prev?.failed_batches ?? -1;

        if (
          data.completed_batches !== prevCompletedBatches ||
          data.failed_batches !== prevFailedBatches
        ) {
          if (data.completed_batches > prevCompletedBatches) {
            events.push({
              type: "batch_progress",
              batchIndex: data.completed_batches - 1,
              totalBatches: data.total_batches,
              batchStatus: "completed",
            });
          }
          if (data.failed_batches > prevFailedBatches) {
            events.push({
              type: "batch_progress",
              batchIndex: data.completed_batches + data.failed_batches - 1,
              totalBatches: data.total_batches,
              batchStatus: "failed",
            });
          }
        }

        // Send progress update
        const prevCompleted = prev?.completed_photos ?? -1;
        if (data.completed_photos !== prevCompleted) {
          events.push({
            type: "progress",
            completed: data.completed_photos,
            total: data.total_photos,
          });
        }

        // Terminal states
        if (data.status === "completed" || data.status === "partially_completed") {
          events.push({ type: "done" });
        } else if (data.status === "failed") {
          events.push({ type: "error", message: data.error ?? "Analysis failed" });
        }

        return events;
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /analyses/:id - Update editable AI-generated fields
router.patch("/analyses/:id", async (req, res, next) => {
  try {
    const { property_assessment, style_direction } = req.body;
    const result = await editAnalysisFields(
      { analysisId: req.params.id, property_assessment, style_direction },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /analyses/:id/archive - Soft-delete (archive) an analysis
router.patch("/analyses/:id/archive", async (req, res, next) => {
  try {
    await archiveAnalysis(
      { analysisId: req.params.id },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
