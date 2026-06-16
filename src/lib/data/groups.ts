import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type CurrentGroup = { id: string; name: string; timezone: string };

/** Cookie holding the user's actively-selected group (see the group switcher). */
export const GROUP_COOKIE = "durak_group_id";

/**
 * The signed-in user's active group. If a group is selected via the cookie and
 * the user can still see it (RLS-checked by the query returning a row), use it;
 * otherwise fall back to the group the user has played the most games in
 * (tie-break earliest-created), computed by the `most_played_group` RPC so RLS
 * still applies. The cookie lets a multi-group user switch between them (e.g. a
 * test group vs. their real group) — see the Manage group page.
 */
export async function getCurrentGroup(): Promise<CurrentGroup | null> {
  const supabase = await createClient();

  const cookieStore = await cookies();
  const selected = cookieStore.get(GROUP_COOKIE)?.value;
  if (selected) {
    const { data } = await supabase
      .from("groups")
      .select("id, name, timezone")
      .eq("id", selected)
      .maybeSingle();
    if (data) return data;
  }

  // Default to the most-played group (tie-break / zero-games default is the
  // earliest-created group, resolved inside the RPC).
  const { data: groupId } = await supabase.rpc("most_played_group");
  if (groupId) {
    const { data } = await supabase
      .from("groups")
      .select("id, name, timezone")
      .eq("id", groupId)
      .maybeSingle();
    if (data) return data;
  }

  // Defensive last resort if the RPC is unavailable: earliest-created group.
  const { data } = await supabase
    .from("groups")
    .select("id, name, timezone")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
