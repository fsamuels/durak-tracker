import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type CurrentGroup = { id: string; name: string; timezone: string };

/** Cookie holding the user's actively-selected group (see the group switcher). */
export const GROUP_COOKIE = "durak_group_id";

/**
 * The signed-in user's active group. If a group is selected via the cookie and
 * the user can still see it (RLS-checked by the query returning a row), use it;
 * otherwise fall back to the earliest-created group the user belongs to. v1
 * assumes a single primary group, but the cookie lets a multi-group user switch
 * between them (e.g. a test group vs. their real group).
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

  const { data } = await supabase
    .from("groups")
    .select("id, name, timezone")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
