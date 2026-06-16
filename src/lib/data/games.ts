import { createClient } from "@/lib/supabase/server";
import { zonedDayEndUtc, zonedDayStartUtc } from "@/lib/time";

/** Columns + embedded players the history list needs. Shared so home and the
 * full history page render identical rows. */
const HISTORY_SELECT = `id, started_at, ended_at, trump_suit, deck_count,
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
 * A group's games, newest first, RLS-scoped to the caller. Used by the home
 * page (last 6, no filter) and the full history page (capped, optional
 * date-range filter). Date bounds are converted to UTC instants via
 * src/lib/time.ts (DST-aware: gte start / lt next-day-after-end).
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
    .order("started_at", { ascending: false })
    .limit(limit);

  if (start) query = query.gte("started_at", zonedDayStartUtc(start, timezone));
  if (end) query = query.lt("started_at", zonedDayEndUtc(end, timezone));

  const { data, error } = await query;
  return { games: data ?? [], error };
}

export type GameHistoryGame = Awaited<
  ReturnType<typeof getGameHistory>
>["games"][number];
