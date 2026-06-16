import { z } from "zod";

import { TRUMP_SUITS } from "./game";

/**
 * Schemas for the `group_stats` / `player_stats` RPCs. The RPCs return `jsonb`
 * (typed as `Json` by the generated client), so we parse the result to get a
 * typed, validated shape. Raw counts come back from SQL; rates and percentages
 * are derived in the pages (see helpers below).
 */

const playerLine = z.object({
  player_id: z.uuid(),
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
      player_id: z.uuid(),
      display_name: z.string(),
      started_at: z.string(),
    })
    .nullable(),
});

export type GroupStats = z.infer<typeof groupStatsSchema>;

export const playerStatsSchema = z.object({
  games_played: z.number().int(),
  durak_count: z.number().int(),
  first_out_count: z.number().int(),
  last_out_count: z.number().int(),
  current_durak_streak: z.number().int(),
  longest_durak_streak: z.number().int(),
  current_win_streak: z.number().int(),
  longest_win_streak: z.number().int(),
});

export type PlayerStats = z.infer<typeof playerStatsSchema>;

/** Route param for the player-stats page. */
export const playerParamSchema = z.object({ playerId: z.uuid() });

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
