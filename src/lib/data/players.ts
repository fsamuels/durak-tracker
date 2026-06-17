import { createClient } from "@/lib/supabase/server";

export type RosterPlayer = {
  id: string;
  display_name: string;
  games_played: number;
};

/**
 * The current group's roster, ranked by completed games played (desc), then
 * name. Backs the player picker in the start/finish flows so frequent players
 * surface first; name search over the result is done client-side. RLS-scoped to
 * the caller via the SECURITY INVOKER group_roster RPC.
 */
export async function getGroupRoster(
  groupId: string,
): Promise<{ roster: RosterPlayer[]; error: { message: string } | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_roster", {
    p_group_id: groupId,
  });

  const roster: RosterPlayer[] = (data ?? []).map((r) => ({
    id: r.id,
    display_name: r.display_name,
    games_played: Number(r.games_played ?? 0),
  }));

  return { roster, error };
}

/**
 * The player row in `groupId` linked to the signed-in user (via
 * `players.auth_user_id = auth.uid()`), or null if the user has no player in the
 * group (e.g. they only manage it) or isn't signed in. Used to default-select
 * the game's creator on the start form. RLS-scoped to the caller.
 */
export async function getCurrentUserPlayerId(
  groupId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("players")
    .select("id")
    .eq("group_id", groupId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data?.id ?? null;
}
