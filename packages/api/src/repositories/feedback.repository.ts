import { supabase } from "../config/supabase.js";
import type { DbFeedback } from "@str-renovator/shared";

export async function create(data: {
  renovation_id: string;
  user_id: string;
  rating: string;
  comment: string | null;
}): Promise<DbFeedback> {
  const { data: feedback, error } = await supabase
    .from("feedback")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return feedback as DbFeedback;
}

export async function listByRenovationIds(
  renovationIds: string[]
): Promise<DbFeedback[]> {
  const { data } = await supabase
    .from("feedback")
    .select("*")
    .in("renovation_id", renovationIds)
    .order("created_at", { ascending: true });
  return (data ?? []) as DbFeedback[];
}
