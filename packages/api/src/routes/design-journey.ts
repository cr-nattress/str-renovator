import { Router } from "express";
import { z } from "zod";
import { PlatformError } from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";

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
      (data ?? []).map(async (item: any) => {
        let image_url: string | null = null;
        if (item.image_storage_path) {
          try {
            image_url = await storageService.getSignedUrl(item.image_storage_path);
          } catch {
            // Signed URL generation failed — leave as null
          }
        }
        return { ...item, image_url };
      })
    );

    res.json(itemsWithUrls);
  } catch (err) {
    next(err);
  }
});

// POST /properties/:propertyId/journey - Create journey item
router.post("/properties/:propertyId/journey", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { propertyId } = req.params;
    const body = createJourneyItemSchema.parse(req.body);

    // Verify ownership
    const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

    if (!property) {
      throw PlatformError.notFound("Property", propertyId);
    }

    const data = await journeyRepo.create({
      ...body,
      property_id: propertyId,
      user_id: user.id,
    });

    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw PlatformError.validationError(err.errors.map(e => e.message).join(", "));
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

    // Generate signed URL for the AI-generated image
    let image_url: string | null = null;
    if (item.image_storage_path) {
      try {
        image_url = await storageService.getSignedUrl(item.image_storage_path);
      } catch {
        // Signed URL generation failed — leave as null
      }
    }

    // Generate signed URL for the original source photo
    let source_photo_url: string | null = null;
    if (item.source_photo_id) {
      const photo = await photoRepo.findStoragePath(item.source_photo_id);

      if (photo?.storage_path) {
        try {
          source_photo_url = await storageService.getSignedUrl(photo.storage_path);
        } catch {
          // Signed URL generation failed — leave as null
        }
      }
    }

    res.json({ ...item, image_url, source_photo_url });
  } catch (err) {
    next(err);
  }
});

// PATCH /journey/:id - Update journey item
router.patch("/journey/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const body = updateJourneyItemSchema.parse(req.body);

    const data = await journeyRepo.update(req.params.id, user.id, body);

    if (!data) {
      throw PlatformError.notFound("Journey item", req.params.id);
    }
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw PlatformError.validationError(err.errors.map(e => e.message).join(", "));
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

    // Parse estimated costs (e.g., "$100-200" -> take midpoint)
    let totalEstimated = 0;
    for (const item of allItems) {
      if (item.estimated_cost) {
        const numbers = item.estimated_cost.match(/[\d,]+/g);
        if (numbers && numbers.length >= 2) {
          const low = parseInt(numbers[0].replace(/,/g, ""), 10);
          const high = parseInt(numbers[1].replace(/,/g, ""), 10);
          totalEstimated += (low + high) / 2;
        } else if (numbers && numbers.length === 1) {
          totalEstimated += parseInt(numbers[0].replace(/,/g, ""), 10);
        }
      }
    }

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
      total_actual: totalActual,
      by_status: statusCounts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
