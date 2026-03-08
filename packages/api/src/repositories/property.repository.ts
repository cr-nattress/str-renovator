import { supabase } from "../config/supabase.js";
import type { DbProperty } from "@str-renovator/shared";

export async function countByUser(userId: string): Promise<number> {
  const { count } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export async function create(
  data: Partial<DbProperty> & { name: string; user_id: string }
): Promise<DbProperty> {
  const { data: property, error } = await supabase
    .from("properties")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return property as DbProperty;
}

export async function listByUser(userId: string): Promise<DbProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbProperty[];
}

export async function findByIdAndUser(
  id: string,
  userId: string
): Promise<DbProperty | null> {
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as DbProperty) ?? null;
}

export async function findById(id: string): Promise<DbProperty | null> {
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  return (data as DbProperty) ?? null;
}

export async function findByIdWithColumns(
  id: string,
  userId: string,
  columns: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("properties")
    .select(columns)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as unknown as Record<string, unknown>) ?? null;
}

export async function update(
  id: string,
  userId: string,
  data: Partial<DbProperty>
): Promise<DbProperty | null> {
  const { data: updated, error } = await supabase
    .from("properties")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return (updated as DbProperty) ?? null;
}

export async function updateById(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function remove(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
