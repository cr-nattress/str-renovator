import { Router } from "express";
import { z } from "zod";
import { checkTierLimit } from "../middleware/tier.js";
import { PlatformError } from "@str-renovator/shared";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";
import * as analysisRepo from "../repositories/analysis.repository.js";
import * as storageService from "../services/storage.service.js";
import {
  createProperty,
  createPropertyFromUrl,
  updateProperty,
  deleteProperty,
} from "../commands/index.js";
import { computePropertyActions } from "../actions/index.js";

const router = Router();

const createPropertySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  listing_url: z.string().url().optional(),
  context: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
});

const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  listing_url: z.string().url().optional(),
  context: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  scraped_data: z.record(z.unknown()).optional(),
  location_profile: z.record(z.unknown()).optional(),
  property_profile: z.record(z.unknown()).optional(),
  review_analysis: z.record(z.unknown()).optional(),
});

// POST /from-url - Create property from listing URL + start scrape
const fromUrlSchema = z.object({
  listingUrl: z.string().url(),
});

router.post("/from-url", checkTierLimit("properties"), async (req, res, next) => {
  try {
    const body = fromUrlSchema.parse(req.body);
    const result = await createPropertyFromUrl(body, {
      userId: req.dbUser!.id,
      user: req.dbUser!,
      tierLimit: req.tierLimit,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
    }
    next(err);
  }
});

// POST / - Create property
router.post("/", checkTierLimit("properties"), async (req, res, next) => {
  try {
    const body = createPropertySchema.parse(req.body);
    const result = await createProperty(body, {
      userId: req.dbUser!.id,
      user: req.dbUser!,
      tierLimit: req.tierLimit,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(PlatformError.validationError(err.errors.map(e => e.message).join(", ")));
    }
    next(err);
  }
});

// GET / - List user's properties with summary data (photos, analyses)
router.get("/", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const properties = await propertyRepo.listByUser(user.id);

    const enriched = await Promise.all(
      properties.map(async (property) => {
        const [photoCount, photos, latestAnalysis] = await Promise.all([
          photoRepo.countByProperty(property.id),
          photoRepo.listByProperty(property.id).then((all) => all.slice(0, 5)),
          analysisRepo.findLatestByProperty(property.id, user.id),
        ]);

        const signedUrls = await Promise.all(
          photos.map((photo) => storageService.getSignedUrlOrNull(photo.storage_path))
        );
        const thumbnailUrls = signedUrls.filter((url): url is string => url !== null);

        return {
          ...property,
          photo_count: photoCount,
          thumbnail_urls: thumbnailUrls,
          latest_analysis: latestAnalysis,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET /:id - Get single property with available actions
router.get("/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const data = await propertyRepo.findByIdAndUser(req.params.id, user.id);

    if (!data) {
      throw PlatformError.notFound("Property", req.params.id);
    }

    const photoCount = await photoRepo.countByProperty(data.id);
    const availableActions = computePropertyActions(data, {
      photoCount,
      hasScrapedData: !!data.scraped_data,
    });

    res.json({ ...data, availableActions });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id - Update property
router.patch("/:id", async (req, res, next) => {
  try {
    const body = updatePropertySchema.parse(req.body);
    const result = await updateProperty(
      { propertyId: req.params.id, ...body },
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

// DELETE /:id - Delete property
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteProperty(
      { propertyId: req.params.id },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
