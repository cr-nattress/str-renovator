import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import * as storageService from "../services/storage.service.js";

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

    const { data, error } = await supabase
      .from("design_journey_items")
      .select("*")
      .eq("property_id", propertyId)
      .order("priority", { ascending: true });

    if (error) throw error;

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

    const { data, error } = await supabase
      .from("design_journey_items")
      .insert({
        ...body,
        property_id: propertyId,
        user_id: user.id,
      })
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

// PATCH /journey/:id - Update journey item
router.patch("/journey/:id", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const body = updateJourneyItemSchema.parse(req.body);

    const { data, error } = await supabase
      .from("design_journey_items")
      .update(body)
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Journey item not found" });
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

// GET /properties/:propertyId/journey/summary - Aggregate summary
router.get("/properties/:propertyId/journey/summary", async (req, res, next) => {
  try {
    const user = req.dbUser!;
    const { propertyId } = req.params;

    // Verify ownership
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

    const { data: items, error } = await supabase
      .from("design_journey_items")
      .select("*")
      .eq("property_id", propertyId);

    if (error) throw error;

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
