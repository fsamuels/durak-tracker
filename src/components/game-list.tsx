import Link from "next/link";
import type { ReactNode } from "react";

import type { GameHistoryGame } from "@/lib/data/games";
import { formatInTz } from "@/lib/time";
import { TRUMP_SUIT_LABELS, type TrumpSuit } from "@/lib/validation/game";
import { formatDuration } from "@/lib/validation/stats";

/**
 * Renders a list of games (newest first). Shared by the home page (last 6) and
 * the full history page. Each row shows the start time in the group's timezone,
 * the durak, the participants, and trump suit / deck count when present. The
 * caller supplies `emptyState` so each page can phrase "no games" its own way.
 */
export function GameList({
  games,
  timezone,
  emptyState,
}: {
  games: GameHistoryGame[];
  timezone: string;
  emptyState: ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {games.map((game) => {
        const participants = game.game_players ?? [];
        const names = participants
          .map((gp) => gp.players?.display_name)
          .filter((n): n is string => Boolean(n));
        const durak = participants.find((gp) => gp.is_durak)?.players
          ?.display_name;
        const trump = game.trump_suit
          ? TRUMP_SUIT_LABELS[game.trump_suit as TrumpSuit]
          : null;
        const durationSeconds = game.ended_at
          ? (new Date(game.ended_at).getTime() -
              new Date(game.started_at).getTime()) /
            1000
          : null;

        return (
          <li
            key={game.id}
            className="card-surface flex flex-col gap-2 rounded-2xl px-4 py-3 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-black dark:text-zinc-50">
                {formatInTz(game.started_at, timezone)}
              </span>
              {durak && (
                <span className="badge-durak shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                  Durak: {durak}
                </span>
              )}
            </div>

            {names.length > 0 && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {names.join(", ")}
              </p>
            )}

            {(trump || game.deck_count != null) && (
              <p className="text-xs text-zinc-500">
                {[
                  trump,
                  game.deck_count != null
                    ? `${game.deck_count} deck${game.deck_count === 1 ? "" : "s"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {game.logged_by_name && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Logged by {game.logged_by_name}
              </p>
            )}

            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <Link
                  href={`/games/new?from=${game.id}`}
                  className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
                >
                  ↻ Play again
                </Link>
                <Link
                  href={`/games/${game.id}/edit`}
                  className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
                >
                  Edit
                </Link>
              </div>
              {durationSeconds != null && (
                <span className="shrink-0 text-xs text-zinc-500">
                  ⏱ {formatDuration(durationSeconds)}
                </span>
              )}
            </div>
          </li>
        );
      })}

      {games.length === 0 && emptyState}
    </ul>
  );
}
