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
