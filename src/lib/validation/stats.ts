import { z } from "zod";

import { TRUMP_SUITS, type TrumpSuit } from "./game";

/**
 * Schemas for the `group_stats` / `player_stats` RPCs. The RPCs return `jsonb`
 * (typed as `Json` by the generated client), so we parse the result to get a
 * typed, validated shape. Raw counts come back from SQL; rates and percentages
 * are derived in the pages (see helpers below).
 *
 * Ids use `z.guid()`, not `z.uuid()`: some ids in the DB are valid 8-4-4-4-12
 * GUIDs but not RFC-9562 version-conformant (e.g. seed ids like a0000000-…),
 * which Zod 4's strict `z.uuid()` rejects — that would fail the whole parse and
 * blank out the stats pages. `guid` validates the shape without the version bit.
 */

const playerLine = z.object({
  player_id: z.guid(),
  display_name: z.string(),
  games_played: z.number().int(),
  durak_count: z.number().int(),
  first_out_count: z.number().int(),
  last_out_count: z.number().int(),
});

export type GroupPlayerLine = z.infer<typeof playerLine>;

export const groupStatsSchema = z.object({
  games_played: z.number().int(),
  games_with_duration: z.number().int(),
  avg_duration_seconds: z.number().nullable(),
  longest_game_seconds: z.number().nullable(),
  shortest_game_seconds: z.number().nullable(),
  trump_frequency: z.array(
    z.object({ suit: z.enum(TRUMP_SUITS), count: z.number().int() }),
  ),
  players: z.array(playerLine),
  player_game_count: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      avg: z.number().nullable(),
    })
    .nullable(),
  last_durak: z
    .object({
      player_id: z.guid(),
      display_name: z.string(),
      started_at: z.string(),
    })
    .nullable(),
  biggest_rivalry: z
    .object({
      player_a_id: z.guid(),
      player_a_name: z.string(),
      player_a_durak_count: z.number().int(),
      player_b_id: z.guid(),
      player_b_name: z.string(),
      player_b_durak_count: z.number().int(),
      games_together: z.number().int(),
    })
    .nullable(),
});

export type GroupStats = z.infer<typeof groupStatsSchema>;

/** One result in a player's recent-form strip (most recent first). */
export const GAME_RESULTS = [
  "durak",
  "first_out",
  "last_out",
  "middle",
] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

export const playerStatsSchema = z.object({
  games_played: z.number().int(),
  durak_count: z.number().int(),
  first_out_count: z.number().int(),
  last_out_count: z.number().int(),
  current_durak_streak: z.number().int(),
  longest_durak_streak: z.number().int(),
  current_win_streak: z.number().int(),
  longest_win_streak: z.number().int(),
  recent_form: z.array(
    z.object({
      result: z.enum(GAME_RESULTS),
      started_at: z.string(),
    }),
  ),
});

export type PlayerStats = z.infer<typeof playerStatsSchema>;

/** Per-opponent head-to-head line (sorted by games together, desc). */
export const headToHeadSchema = z.array(
  z.object({
    opponent_id: z.guid(),
    display_name: z.string(),
    games_together: z.number().int(),
    my_durak_count: z.number().int(),
    opponent_durak_count: z.number().int(),
  }),
);

export type HeadToHead = z.infer<typeof headToHeadSchema>;

/** Route param for the player-stats page. */
export const playerParamSchema = z.object({ playerId: z.guid() });

/** Stat time-window buckets (group-timezone) the RPCs accept via `p_window`. */
export const STATS_WINDOWS = ["all", "week", "month", "year"] as const;
export type StatsWindow = (typeof STATS_WINDOWS)[number];

export const WINDOW_LABELS: Record<StatsWindow, string> = {
  all: "All time",
  week: "This week",
  month: "This month",
  year: "This year",
};

/** Coerce a raw `?window=` search param into a valid window (defaults to all). */
export function parseWindow(raw: string | string[] | undefined): StatsWindow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return STATS_WINDOWS.includes(v as StatsWindow) ? (v as StatsWindow) : "all";
}

/**
 * The group's most-frequent trump suit (the "top suit"). The `group_stats` RPC
 * already orders `trump_frequency` by count desc, but we pick the max defensively
 * so the result is correct regardless of ordering. Returns null when no completed
 * game has recorded a trump suit.
 */
export function topTrumpSuit(
  stats: GroupStats | null,
): { suit: TrumpSuit; count: number } | null {
  if (!stats || stats.trump_frequency.length === 0) return null;
  return stats.trump_frequency.reduce((top, t) =>
    t.count > top.count ? t : top,
  );
}

/** A player's durak rate in [0, 1]; 0 when they have no games. */
export function durakRate(p: {
  durak_count: number;
  games_played: number;
}): number {
  return p.games_played > 0 ? p.durak_count / p.games_played : 0;
}

/**
 * Order players by durak rate desc (most durak-prone first), breaking ties by
 * raw durak count then name. The `group_stats` RPC orders by raw count (the home
 * page depends on that), so the leaderboard re-sorts a copy by rate here.
 */
export function byDurakRateDesc(
  a: GroupPlayerLine,
  b: GroupPlayerLine,
): number {
  return (
    durakRate(b) - durakRate(a) ||
    b.durak_count - a.durak_count ||
    a.display_name.localeCompare(b.display_name)
  );
}

/**
 * The group "champion": the player with the *lowest* durak rate. Only players
 * with at least `minGames` completed games qualify, so a one-game fluke can't
 * take the crown; returns null if nobody has played enough. Ties go to whoever
 * played more games, then name.
 */
export function durakChampion(
  players: GroupPlayerLine[],
  minGames = 3,
): GroupPlayerLine | null {
  const eligible = players.filter((p) => p.games_played >= minGames);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, p) =>
    durakRate(p) < durakRate(best) ||
    (durakRate(p) === durakRate(best) &&
      (p.games_played > best.games_played ||
        (p.games_played === best.games_played &&
          p.display_name.localeCompare(best.display_name) < 0)))
      ? p
      : best,
  );
}

/** Format a count / total as a percentage string, e.g. `33%`. `0` games → `—`. */
export function rate(count: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((count / total) * 100)}%`;
}

/** Human-readable duration from seconds, e.g. `42m` or `1h 05m`. */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
