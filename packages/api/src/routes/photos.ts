import { Router } from "express";
import multer from "multer";
import { checkTierLimit } from "../middleware/tier.js";
import {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  PlatformError,
} from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";
import * as propertyRepo from "../repositories/property.repository.js";
import * as photoRepo from "../repositories/photo.repository.js";
import {
  uploadPhotos,
  updatePhotoMetadata,
  deletePhoto,
} from "../commands/index.js";

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
      const files = (req.files as Express.Multer.File[]) ?? [];
      const result = await uploadPhotos(
        {
          propertyId: req.params.propertyId as string,
          files: files.map((f) => ({
            buffer: f.buffer,
            originalname: f.originalname,
            mimetype: f.mimetype,
          })),
        },
        {
          userId: req.dbUser!.id,
          user: req.dbUser!,
          tierLimit: req.tierLimit,
        },
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
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
          const url = await storageService.getSignedUrlOrNull(photo.storage_path);
          return url ? { ...photo, url } : null;
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
    const { display_name, description, tags, constraints } = req.body;
    const result = await updatePhotoMetadata(
      { photoId: req.params.id, display_name, description, tags, constraints },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /photos/:id - Delete photo
router.delete("/photos/:id", async (req, res, next) => {
  try {
    await deletePhoto(
      { photoId: req.params.id },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
