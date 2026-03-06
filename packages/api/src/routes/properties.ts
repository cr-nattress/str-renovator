import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { checkTierLimit } from "../middleware/tier.js";
import { TIER_LIMITS } from "@str-renovator/shared";

const router = Router();

const createPropertySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  listing_url: z.string().url().optional(),
  context: z.string().optional(),
});

const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  listing_url: z.string().url().optional(),
  context: z.string().optional(),
});

// POST / - Create property
router.post("/", checkTierLimit("properties"), async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const body = createPropertySchema.parse(req.body);

    // Check current count against tier limit
    const { count } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const limit = TIER_LIMITS[user.tier].properties;
    if ((count ?? 0) >= limit) {
      res.status(403).json({
        error: `Property limit reached (${limit}) for your ${user.tier} plan`,
      });
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({ ...body, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    next(err);
  }
});

// GET / - List user's properties
router.get("/", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /:id - Get single property
router.get("/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id - Update property
router.patch("/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const body = updatePropertySchema.parse(req.body);

    const { data, error } = await supabase
      .from("properties")
      .update(body)
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    next(err);
  }
});

// DELETE /:id - Delete property
router.delete("/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
