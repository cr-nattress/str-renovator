/**
 * @module edit-history.repository
 * @capability Edit history persistence
 * @layer Execution
 *
 * CRUD for edit_history table — tracks field-level edits to AI-generated
 * content for undo/rollback support.
 */

import { supabase } from "../config/supabase.js";
import type { DbEditHistory } from "@str-renovator/shared";

export async function create(
  data: Omit<DbEditHistory, "id" | "created_at">,
): Promise<DbEditHistory> {
  const { data: row, error } = await supabase
    .from("edit_history")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as DbEditHistory;
}

export async function findByEntity(
  entityType: string,
  entityId: string,
): Promise<DbEditHistory[]> {
  const { data, error } = await supabase
    .from("edit_history")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbEditHistory[];
}

export async function findById(id: string): Promise<DbEditHistory | null> {
  const { data } = await supabase
    .from("edit_history")
    .select("*")
    .eq("id", id)
    .single();
  return (data as DbEditHistory) ?? null;
}
