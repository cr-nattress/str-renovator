import { supabase } from "../config/supabase.js";

export async function create(data: {
  property_id: string;
  user_id: string;
  listing_url: string;
  status: string;
}): Promise<Record<string, unknown>> {
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert(data)
    .select()
    .single();
  if (error || !job) throw error ?? new Error("Failed to create scrape job");
  return job;
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function listByProperty(
  propertyId: string,
  userId: string,
  limit = 10
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("scrape_jobs")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw error;
}

export async function updateFields(
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("scrape_jobs")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}
