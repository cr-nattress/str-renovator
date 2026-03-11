import { supabase } from "../config/supabase.js";
import type { DbDesignJourneyItem } from "@str-renovator/shared";

export async function listByProperty(
  propertyId: string
): Promise<DbDesignJourneyItem[]> {
  const { data, error } = await supabase
    .from("design_journey_items")
    .select("*")
    .eq("property_id", propertyId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDesignJourneyItem[];
}

export async function create(
  data: Partial<DbDesignJourneyItem> & {
    property_id: string;
    user_id: string;
    priority: number;
    title: string;
    impact: string;
    rooms_affected: string[];
  }
): Promise<DbDesignJourneyItem> {
  const { data: item, error } = await supabase
    .from("design_journey_items")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return item as DbDesignJourneyItem;
}

export async function upsertByTitle(
  data: Partial<DbDesignJourneyItem> & {
    property_id: string;
    user_id: string;
    priority: number;
    title: string;
    impact: string;
    rooms_affected: string[];
  }
): Promise<DbDesignJourneyItem> {
  // Try insert first
  const { data: item, error } = await supabase
    .from("design_journey_items")
    .insert(data)
    .select()
    .single();

  if (error && error.code === "23505") {
    // Unique violation — update the existing row instead
    const { data: existing, error: findErr } = await supabase
      .from("design_journey_items")
      .select("*")
      .eq("property_id", data.property_id)
      .ilike("title", data.title)
      .single();
    if (findErr) throw findErr;

    const { data: updated, error: updateErr } = await supabase
      .from("design_journey_items")
      .update({
        analysis_id: data.analysis_id,
        priority: data.priority,
        estimated_cost: data.estimated_cost,
        impact: data.impact,
        rooms_affected: data.rooms_affected,
        source_photo_id: data.source_photo_id,
        image_status: data.image_status,
      })
      .eq("id", existing!.id)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return updated as DbDesignJourneyItem;
  }

  if (error) throw error;
  return item as DbDesignJourneyItem;
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<DbDesignJourneyItem | null> {
  const { data } = await supabase
    .from("design_journey_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as DbDesignJourneyItem) ?? null;
}

export async function update(
  id: string,
  userId: string,
  data: Record<string, unknown>
): Promise<DbDesignJourneyItem | null> {
  const { data: updated, error } = await supabase
    .from("design_journey_items")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return (updated as DbDesignJourneyItem) ?? null;
}

export async function updateById(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("design_journey_items")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function insertMany(
  rows: Array<Partial<DbDesignJourneyItem>>
): Promise<DbDesignJourneyItem[]> {
  const { data, error } = await supabase
    .from("design_journey_items")
    .insert(rows as any)
    .select();
  if (error) throw error;
  return (data ?? []) as DbDesignJourneyItem[];
}

export async function listFailed(
  propertyId?: string
): Promise<DbDesignJourneyItem[]> {
  let query = supabase
    .from("design_journey_items")
    .select("*")
    .eq("image_status", "failed");
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbDesignJourneyItem[];
}
