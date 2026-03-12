import { Router } from "express";
import { z } from "zod";
import { PlatformError } from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";
import {
  createJourneyItem,
  updateJourneyItem,
} from "../commands/index.js";

const router = Router();

const createJourneyItemSchema = z.object({
  priority: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional(),
  estimated_cost: z.string().optional(),
  impact: z.enum(["high", "medium", "low"]),
  rooms_affected: z.array(z.string()),
});

const updateJourneyItemSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed", "skipped"]).optional(),
  actual_cost: z.number().optional(),
  notes: z.string().optional(),
});

// GET /properties/:propertyId/journey - List journey items
router.get("/properties/:propertyId/journey", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { propertyId } = req.params;

    // Verify ownership
    const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

    if (!property) {
      throw PlatformError.notFound("Property", propertyId);
    }

    const data = await journeyRepo.listByProperty(propertyId);

    // Generate signed URLs for items with images
    const itemsWithUrls = await Promise.all(
      (data ?? []).map(async (item: any) => ({
        ...item,
        image_url: await storageService.getSignedUrlOrNull(item.image_storage_path),
      }))
    );

    res.json(itemsWithUrls);
  } catch (err) {
    next(err);
  }
});

// POST /properties/:propertyId/journey - Create journey item
router.post("/properties/:propertyId/journey", async (req, res, next) => {
  try {
    const body = createJourneyItemSchema.parse(req.body);
    const result = await createJourneyItem(
      { propertyId: req.params.propertyId, ...body },
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

// GET /journey/:id - Get single journey item with signed URLs
router.get("/journey/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const item = await journeyRepo.findByIdAndUser(req.params.id, user.id);

    if (!item) {
      throw PlatformError.notFound("Journey item", req.params.id);
    }

    // Generate signed URLs for AI-generated image and source photo
    const image_url = await storageService.getSignedUrlOrNull(item.image_storage_path);

    let source_photo_url: string | null = null;
    if (item.source_photo_id) {
      const photo = await photoRepo.findStoragePath(item.source_photo_id);
      source_photo_url = await storageService.getSignedUrlOrNull(photo?.storage_path);
    }

    res.json({ ...item, image_url, source_photo_url });
  } catch (err) {
    next(err);
  }
});

// PATCH /journey/:id - Update journey item
router.patch("/journey/:id", async (req, res, next) => {
  try {
    const body = updateJourneyItemSchema.parse(req.body);
    const result = await updateJourneyItem(
      { journeyItemId: req.params.id, ...body },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
    }
    next(err);
  }
});

// GET /properties/:propertyId/journey/summary - Aggregate summary
router.get("/properties/:propertyId/journey/summary", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { propertyId } = req.params;

    // Verify ownership
    const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

    if (!property) {
      throw PlatformError.notFound("Property", propertyId);
    }

    const items = await journeyRepo.listByProperty(propertyId);

    const allItems = items ?? [];

    // Aggregate estimated costs: prefer numeric fields, fall back to string parsing
    let totalEstimatedMin = 0;
    let totalEstimatedMax = 0;
    for (const item of allItems) {
      if (item.estimated_cost_min != null || item.estimated_cost_max != null) {
        totalEstimatedMin += item.estimated_cost_min ?? 0;
        totalEstimatedMax += item.estimated_cost_max ?? 0;
      } else if (item.estimated_cost) {
        const numbers = item.estimated_cost.match(/[\d,]+/g);
        if (numbers && numbers.length >= 2) {
          const low = parseInt(numbers[0].replace(/,/g, ""), 10);
          const high = parseInt(numbers[1].replace(/,/g, ""), 10);
          totalEstimatedMin += low;
          totalEstimatedMax += high;
        } else if (numbers && numbers.length === 1) {
          const val = parseInt(numbers[0].replace(/,/g, ""), 10);
          totalEstimatedMin += val;
          totalEstimatedMax += val;
        }
      }
    }
    const totalEstimated = (totalEstimatedMin + totalEstimatedMax) / 2;

    const totalActual = allItems.reduce(
      (sum: number, item: any) => sum + (item.actual_cost ?? 0),
      0
    );

    const statusCounts: Record<string, number> = {};
    for (const item of allItems) {
      statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
    }

    res.json({
      total_items: allItems.length,
      total_estimated: totalEstimated,
      total_estimated_min: totalEstimatedMin,
      total_estimated_max: totalEstimatedMax,
      total_actual: totalActual,
      by_status: statusCounts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
