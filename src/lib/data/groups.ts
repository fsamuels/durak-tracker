import { createClient } from "@/lib/supabase/server";

export type CurrentGroup = { id: string; name: string; timezone: string };

/**
 * The signed-in user's active group. v1 assumes a single group per user;
 * multi-group switching is a later decision (see roadmap open questions), so we
 * deterministically pick the earliest-created group the user can see via RLS.
 */
export async function getCurrentGroup(): Promise<CurrentGroup | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, timezone")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
