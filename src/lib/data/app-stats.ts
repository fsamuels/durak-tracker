import { createClient } from "@/lib/supabase/server";

/** App-wide totals for the About page, across every group. */
export type AppStats = {
  groups: number;
  /** Registered auth users, across all providers. */
  accounts: number;
  /** Player rows (group-scoped; the same human can have several). */
  players: number;
  guestPlayers: number;
  /** Completed, non-deleted games. */
  games: number;
  /** Player appearances across those games (sum of table sizes). */
  seats: number;
  /** Total recorded play time of those games, in seconds. */
  playedSeconds: number;
  trumpGames: {
    hearts: number;
    diamonds: number;
    clubs: number;
    spades: number;
  };
  /** Most players seen at one completed game. */
  largestTable: number;
  firstGameAt: string | null;
};

/**
 * Loads app-wide totals via the `get_app_stats` SECURITY DEFINER function
 * (aggregate counts only, granted to `authenticated`). Returns null on any
 * failure — e.g. before its migration has been applied — since the stats are
 * decorative and must never break the page.
 */
export async function getAppStats(): Promise<AppStats | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_app_stats");
    const row = data?.[0];
    if (error || !row) return null;
    return {
      groups: Number(row.groups),
      accounts: Number(row.accounts),
      players: Number(row.players),
      guestPlayers: Number(row.guest_players),
      games: Number(row.games),
      seats: Number(row.seats),
      playedSeconds: Number(row.played_seconds),
      trumpGames: {
        hearts: Number(row.hearts_games),
        diamonds: Number(row.diamonds_games),
        clubs: Number(row.clubs_games),
        spades: Number(row.spades_games),
      },
      largestTable: Number(row.largest_table),
      firstGameAt: row.first_game_at ?? null,
    };
  } catch {
    return null;
  }
}
