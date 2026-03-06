import { Router } from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { checkTierLimit } from "../middleware/tier.js";
import {
  TIER_LIMITS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
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
        res.status(404).json({ error: "Property not found" });
        return;
      }

      // Check photo count limit
      const { count } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId);

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No photos provided" });
        return;
      }

      const limit = TIER_LIMITS[user.tier].photosPerProperty;
      if ((count ?? 0) + files.length > limit) {
        res.status(403).json({
          error: `Photo limit (${limit}) would be exceeded for your ${user.tier} plan`,
        });
        return;
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
      res.status(404).json({ error: "Property not found" });
      return;
    }

    const { data: photos, error } = await supabase
      .from("photos")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Add signed URLs
    const photosWithUrls = await Promise.all(
      (photos ?? []).map(async (photo: any) => ({
        ...photo,
        url: await storageService.getSignedUrl(photo.storage_path),
      }))
    );

    res.json(photosWithUrls);
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
      res.status(404).json({ error: "Photo not found" });
      return;
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
