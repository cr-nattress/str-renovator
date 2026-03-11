/**
 * @module edit-history routes
 * @capability Edit history API surface
 * @layer Surface
 *
 * Exposes edit history endpoints for undo/rollback of AI-generated field edits.
 */

import { Router } from "express";
import { undoEdit } from "../commands/index.js";
import * as editHistoryRepo from "../repositories/edit-history.repository.js";
import { PlatformError } from "@str-renovator/shared";

const router = Router();

// GET /edit-history/:entityType/:entityId - List edit history for an entity
router.get("/edit-history/:entityType/:entityId", async (req, res, next) => {
  try {
    const entries = await editHistoryRepo.findByEntity(
      req.params.entityType,
      req.params.entityId,
    );
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /edit-history/:id/undo - Undo a specific edit
router.post("/edit-history/:id/undo", async (req, res, next) => {
  try {
    const result = await undoEdit(
      { editHistoryId: req.params.id },
      { userId: req.dbUser!.id, user: req.dbUser! },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
