import { Router } from "express";
import multer from "multer";
import { checkTierLimit } from "../middleware/tier.js";
import {
  TIER_LIMITS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  PlatformError,
} from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (SUPPORTED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /properties/:propertyId/photos - Upload photos
router.post(
  "/properties/:propertyId/photos",
  checkTierLimit("photosPerProperty"),
  upload.array("photos", 10),
  async (req, res, next) => {
    try {
      const user = req.dbUser!;
      const propertyId = req.params.propertyId as string;

      // Verify property ownership
      const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

      if (!property) {
        throw PlatformError.notFound("Property", propertyId ?? req.params.propertyId);
      }

      // Check photo count limit
      const count = await photoRepo.countByProperty(propertyId);

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw PlatformError.validationError("No photos provided");
      }

      const limit = (req as any).tierLimit ?? TIER_LIMITS[user.tier].photosPerProperty;
      if (count + files.length > limit) {
        throw PlatformError.tierLimitReached("photos per property", limit);
      }

      // Upload each file
      const insertedPhotos = [];
      for (const file of files) {
        const storagePath = await storageService.uploadPhoto(
          file.buffer,
          user.id,
          propertyId,
          file.originalname,
          file.mimetype
        );

        const photo = await photoRepo.create({
          property_id: propertyId,
          user_id: user.id,
          filename: file.originalname,
          storage_path: storagePath,
          mime_type: file.mimetype,
          source: "upload",
        });

        insertedPhotos.push(photo);
      }

      res.status(201).json(insertedPhotos);
    } catch (err) {
      next(err);
    }
  }
);

// GET /properties/:propertyId/photos - List photos
router.get("/properties/:propertyId/photos", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { propertyId } = req.params;

    // Verify property ownership
    const property = await propertyRepo.findByIdWithColumns(propertyId, user.id, "id");

    if (!property) {
      throw PlatformError.notFound("Property", propertyId ?? req.params.propertyId);
      return;
    }

    const photos = await photoRepo.listByProperty(propertyId);

    // Add signed URLs — skip photos whose storage objects are missing
    const photosWithUrls = (
      await Promise.all(
        photos.map(async (photo: any) => {
          try {
            const url = await storageService.getSignedUrl(photo.storage_path);
            return { ...photo, url };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);

    res.json(photosWithUrls);
  } catch (err) {
    next(err);
  }
});

// PATCH /photos/:id - Update photo metadata
router.patch("/photos/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const photo = await photoRepo.findByIdAndUser(req.params.id, user.id);

    if (!photo) {
      throw PlatformError.notFound("Photo", req.params.id);
    }

    const { display_name, description, tags, constraints } = req.body;
    const updates: Record<string, unknown> = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (constraints !== undefined) updates.constraints = constraints;

    if (Object.keys(updates).length === 0) {
      throw PlatformError.validationError("No fields to update");
    }

    const updated = await photoRepo.update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /photos/:id - Delete photo
router.delete("/photos/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const photo = await photoRepo.findByIdAndUser(req.params.id, user.id);

    if (!photo) {
      throw PlatformError.notFound("Photo", req.params.id);
    }

    await storageService.deletePhoto(photo.storage_path);
    await photoRepo.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
