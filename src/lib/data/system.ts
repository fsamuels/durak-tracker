import { createAdminClient } from "@/lib/supabase/admin";

/** System-wide counts for the /admin overview, across every group (RLS-bypassed). */
export type SystemStats = {
  /** Total groups in the system. */
  totalGroups: number;
  /** Registered auth users (everyone who has signed in), across all providers. */
  totalUsers: number;
  /** Total player rows (group-scoped; the same human can have several). */
  totalPlayers: number;
  /** Player rows with no linked auth user — i.e. guests. */
  guestPlayers: number;
  /** All games, including still-in-progress ones. */
  totalGames: number;
  /** Games that have been finished (ended_at set). */
  completedGames: number;
  /** Completed games whose started_at falls in the last 7 days. */
  games7d: number;
  /** Completed games whose started_at falls in the last 30 days. */
  games30d: number;
  /** Auth users created in the last 7 days. */
  newUsers7d: number;
  /** Distinct groups with a completed game in the last 7 days. */
  activeGroups7d: number;
  /** Name of the group with the most completed games, or null if none exist. */
  topGroupName: string | null;
  /** Completed-game count for that top group (0 when there are no games). */
  topGroupGames: number;
};

/**
 * Loads system-wide aggregate counts for the admin overview via the
 * `admin_system_stats` SECURITY DEFINER function (service-role only), since the
 * counts span every group and so can't come through the anon key + RLS path.
 * Callers MUST confirm the requester is an admin first — see `isAdmin`.
 */
export async function getSystemStats(): Promise<SystemStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_system_stats");
  if (error) throw error;

  // The function always returns exactly one row (see the migration).
  const row = data?.[0];
  if (!row) throw new Error("admin_system_stats returned no rows");

  return {
    totalGroups: row.total_groups,
    totalUsers: row.total_users,
    totalPlayers: row.total_players,
    guestPlayers: row.guest_players,
    totalGames: row.total_games,
    completedGames: row.completed_games,
    games7d: row.games_7d,
    games30d: row.games_30d,
    newUsers7d: row.new_users_7d,
    activeGroups7d: row.active_groups_7d,
    topGroupName: row.top_group_name ?? null,
    topGroupGames: row.top_group_games ?? 0,
  };
}
