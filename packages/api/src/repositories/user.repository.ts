import { supabase } from "../config/supabase.js";
import type { DbUser } from "@str-renovator/shared";

export async function findByClerkId(clerkId: string): Promise<DbUser | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();
  return (data as DbUser) ?? null;
}

export async function create(data: {
  clerk_id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("users")
    .insert(data);
  if (error) throw error;
}

export async function updateByClerkId(
  clerkId: string,
  data: Partial<DbUser>
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update(data)
    .eq("clerk_id", clerkId);
  if (error) throw error;
}

export async function updateById(
  id: string,
  data: Partial<DbUser>
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function incrementAnalysesThisMonth(userId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_analyses_this_month", {
    user_id_input: userId,
  });
  if (error) {
    // Fallback: read-then-write if RPC not available
    const { data } = await supabase.from("users").select("analyses_this_month").eq("id", userId).single();
    if (data) {
      const { error: updateErr } = await supabase
        .from("users")
        .update({ analyses_this_month: (data.analyses_this_month ?? 0) + 1 })
        .eq("id", userId);
      if (updateErr) throw updateErr;
    }
  }
}

export async function removeByClerkId(clerkId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("clerk_id", clerkId);
  if (error) throw error;
}
