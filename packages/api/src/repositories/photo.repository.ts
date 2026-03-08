import { supabase } from "../config/supabase.js";
import type { DbPhoto } from "@str-renovator/shared";

export async function countByProperty(propertyId: string): Promise<number> {
  const { count } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);
  return count ?? 0;
}

export async function create(data: {
  property_id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  source: string;
}): Promise<DbPhoto> {
  const { data: photo, error } = await supabase
    .from("photos")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return photo as DbPhoto;
}

export async function listByProperty(propertyId: string): Promise<DbPhoto[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbPhoto[];
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<DbPhoto | null> {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as DbPhoto) ?? null;
}

export async function findById(id: string): Promise<DbPhoto | null> {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .single();
  return (data as DbPhoto) ?? null;
}

export async function findStoragePath(
  id: string
): Promise<{ storage_path: string } | null> {
  const { data } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function findFirstByProperty(
  propertyId: string
): Promise<DbPhoto | null> {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("property_id", propertyId)
    .limit(1)
    .single();
  return (data as DbPhoto) ?? null;
}

export async function update(
  id: string,
  data: Record<string, unknown>
): Promise<DbPhoto> {
  const { data: updated, error } = await supabase
    .from("photos")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return updated as DbPhoto;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function insertMany(
  rows: Array<{
    property_id: string;
    user_id: string;
    filename: string;
    storage_path: string;
    mime_type: string;
    source: string;
  }>
): Promise<DbPhoto[]> {
  const { data, error } = await supabase
    .from("photos")
    .insert(rows)
    .select();
  if (error) throw error;
  return (data ?? []) as DbPhoto[];
}
