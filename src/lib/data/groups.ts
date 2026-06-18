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

/** A group plus the at-a-glance facts shown on the Manage group page. */
export type GroupDetails = {
  id: string;
  name: string;
  timezone: string;
  /** UTC ISO instant the group was created. */
  createdAt: string;
  /** Display name of the group's creator/owner, or null if not resolvable. */
  ownerName: string | null;
  /** Whether the signed-in viewer is the group's owner (its creator). */
  viewerIsOwner: boolean;
  memberCount: number;
  playerCount: number;
  gameCount: number;
};

/**
 * The current group's metadata for the Manage group page: who owns it, when it
 * was created, and how many members / players / games it holds. All queries are
 * RLS-scoped to the caller, so this only resolves for a group the user belongs
 * to. The owner's display name comes from the creator's player row in the group
 * (`players.auth_user_id = groups.created_by`).
 */
export async function getGroupDetails(
  groupId: string,
): Promise<GroupDetails | null> {
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, timezone, created_at, created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [members, players, games, owner] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", groupId),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId),
    supabase
      .from("players")
      .select("display_name")
      .eq("group_id", groupId)
      .eq("auth_user_id", group.created_by)
      .maybeSingle(),
  ]);

  return {
    id: group.id,
    name: group.name,
    timezone: group.timezone,
    createdAt: group.created_at,
    ownerName: owner.data?.display_name ?? null,
    viewerIsOwner: !!user && group.created_by === user.id,
    memberCount: members.count ?? 0,
    playerCount: players.count ?? 0,
    gameCount: games.count ?? 0,
  };
}
