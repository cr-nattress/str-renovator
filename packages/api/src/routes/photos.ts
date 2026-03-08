import { Router } from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { checkTierLimit } from "../middleware/tier.js";
import {
  TIER_LIMITS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  PlatformError,
} from "@str-renovator/shared";
import * as storageService from "../services/storage.service.js";

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
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("user_id", user.id)
        .single();

      if (!property) {
        throw PlatformError.notFound("Property", propertyId ?? req.params.propertyId);
      }

      // Check photo count limit
      const { count } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId);

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw PlatformError.validationError("No photos provided");
      }

      const limit = (req as any).tierLimit ?? TIER_LIMITS[user.tier].photosPerProperty;
      if ((count ?? 0) + files.length > limit) {
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

        const { data: photo, error } = await supabase
          .from("photos")
          .insert({
            property_id: propertyId,
            user_id: user.id,
            filename: file.originalname,
            storage_path: storagePath,
            mime_type: file.mimetype,
            source: "upload",
          })
          .select()
          .single();

        if (error) throw error;
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
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!property) {
      throw PlatformError.notFound("Property", propertyId ?? req.params.propertyId);
      return;
    }

    const { data: photos, error } = await supabase
      .from("photos")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Add signed URLs — skip photos whose storage objects are missing
    const photosWithUrls = (
      await Promise.all(
        (photos ?? []).map(async (photo: any) => {
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

    const { data: photo } = await supabase
      .from("photos")
      .select("id")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

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

    const { data: updated, error } = await supabase
      .from("photos")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /photos/:id - Delete photo
router.delete("/photos/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;

    const { data: photo } = await supabase
      .from("photos")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

    if (!photo) {
      throw PlatformError.notFound("Photo", req.params.id);
    }

    await storageService.deletePhoto(photo.storage_path);

    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
