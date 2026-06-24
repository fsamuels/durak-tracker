import { createClient } from "@/lib/supabase/server";
import { zonedDayEndUtc, zonedDayStartUtc } from "@/lib/time";

/** Columns + embedded players the history list needs. Shared so home and the
 * full history page render identical rows. */
const HISTORY_SELECT = `id, started_at, ended_at, trump_suit, deck_count, logged_by,
   game_players ( is_durak, players ( display_name ) )`;

export type GameHistoryParams = {
  groupId: string;
  /** Group timezone; date bounds are wall-clock days in this zone. */
  timezone: string;
  /** Inclusive start day (YYYY-MM-DD) in the group's timezone. */
  start?: string;
  /** Inclusive end day (YYYY-MM-DD) in the group's timezone. */
  end?: string;
  limit: number;
};

/**
 * A group's COMPLETED games, newest first, RLS-scoped to the caller. Used by the
 * home page (last 6, no filter) and the full history page (capped, optional
 * date-range filter). In-progress games are excluded here and surfaced
 * separately (see getInProgressGames). Date bounds are converted to UTC instants
 * via src/lib/time.ts (DST-aware: gte start / lt next-day-after-end).
 */
export async function getGameHistory({
  groupId,
  timezone,
  start,
  end,
  limit,
}: GameHistoryParams) {
  const supabase = await createClient();
  let query = supabase
    .from("games")
    .select(HISTORY_SELECT)
    .eq("group_id", groupId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (start) query = query.gte("started_at", zonedDayStartUtc(start, timezone));
  if (end) query = query.lt("started_at", zonedDayEndUtc(end, timezone));

  const { data, error } = await query;
  const games = data ?? [];

  // Resolve logger display names: join players on auth_user_id = logged_by
  // within the same group. No FK exists between the two, so a secondary query
  // is used and the mapping is done in JS.
  const loggedByUids = [...new Set(games.map((g) => g.logged_by))];
  let loggerNames = new Map<string, string>();
  if (loggedByUids.length > 0) {
    const { data: loggers } = await supabase
      .from("players")
      .select("auth_user_id, display_name")
      .eq("group_id", groupId)
      .in("auth_user_id", loggedByUids);
    loggerNames = new Map(
      (loggers ?? []).flatMap((p) =>
        p.auth_user_id ? [[p.auth_user_id, p.display_name]] : [],
      ),
    );
  }

  const gamesWithLogger = games.map((g) => ({
    ...g,
    logged_by_name: loggerNames.get(g.logged_by) ?? null,
  }));

  return { games: gamesWithLogger, error };
}

export type GameHistoryGame = Awaited<
  ReturnType<typeof getGameHistory>
>["games"][number];

/**
 * A group's IN-PROGRESS games (started but not finished), newest first,
 * RLS-scoped to the caller. Surfaced on home and the history page with a
 * Resume/Finish CTA.
 */
export async function getInProgressGames(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      `id, started_at, trump_suit, deck_count,
       game_players ( players ( display_name ) )`,
    )
    .eq("group_id", groupId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false });

  return { games: data ?? [], error };
}

export type InProgressGame = Awaited<
  ReturnType<typeof getInProgressGames>
>["games"][number];

/**
 * The participant player_ids of one prior game in this group, for the "Start
 * again" pre-fill on /games/new. Works for completed or in-progress games (RLS
 * scopes it to the caller's groups); returns [] when the game doesn't exist or
 * isn't in this group.
 */
export async function getGameParticipantIds(
  groupId: string,
  gameId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select(`id, game_players ( player_id )`)
    .eq("id", gameId)
    .eq("group_id", groupId)
    .maybeSingle();

  return (data?.game_players ?? []).map((gp) => gp.player_id);
}

/**
 * One completed game with its full roster + outcomes, for the detail page.
 * Includes player_ids so the UI can link to each player's stats page. Returns
 * null when the game doesn't exist, isn't in this group, or is deleted.
 */
export async function getGameDetail(groupId: string, gameId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("games")
    .select(
      `id, started_at, ended_at, trump_suit, deck_count, notes, logged_by,
       game_players ( player_id, is_durak, is_first_out, is_last_out, players ( display_name ) )`,
    )
    .eq("id", gameId)
    .eq("group_id", groupId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  // Resolve logger display name.
  let loggedByName: string | null = null;
  if (data.logged_by) {
    const { data: logger } = await supabase
      .from("players")
      .select("display_name")
      .eq("group_id", groupId)
      .eq("auth_user_id", data.logged_by)
      .maybeSingle();
    loggedByName = logger?.display_name ?? null;
  }

  return { ...data, logged_by_name: loggedByName };
}

export type GameDetail = NonNullable<Awaited<ReturnType<typeof getGameDetail>>>;

/**
 * One completed game with its full roster + outcomes, for the edit page. Returns
 * null when the game doesn't exist, isn't in this group, is already deleted, or
 * the caller isn't the original logger (only logged_by may edit).
 */
export async function getGameToEdit(groupId: string, gameId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("games")
    .select(
      `id, started_at, ended_at, trump_suit, deck_count, notes, status, logged_by,
       game_players ( player_id, is_durak, is_first_out, is_last_out )`,
    )
    .eq("id", gameId)
    .eq("group_id", groupId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  if (data.logged_by !== user.id) return null;

  return data;
}

/**
 * One in-progress game with its current roster + any outcomes recorded so far,
 * for the finish/update page. Outcomes are included because update_game lets a
 * first-out (etc.) be saved mid-play, and reopening the game must reflect that.
 * Returns null when the game doesn't exist, isn't in this group, or is already
 * finished (RLS also scopes it to groups the caller belongs to).
 */
export async function getGameToFinish(groupId: string, gameId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select(
      `id, trump_suit, deck_count, notes, status,
       game_players ( player_id, is_durak, is_first_out, is_last_out )`,
    )
    .eq("id", gameId)
    .eq("group_id", groupId)
    .eq("status", "in_progress")
    .maybeSingle();

  return data;
}
