import Link from "next/link";

import type { InProgressGame } from "@/lib/data/games";
import { formatInTz } from "@/lib/time";
import { TRUMP_SUIT_LABELS, type TrumpSuit } from "@/lib/validation/game";

/**
 * In-progress games (started but not finished) with a Finish CTA. Shared by home
 * and the history page so a half-logged game is always one tap from completion.
 */
export function InProgressGames({
  games,
  timezone,
}: {
  games: InProgressGame[];
  timezone: string;
}) {
  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-500">In progress</h2>
      <ul className="flex flex-col gap-2">
        {games.map((game) => {
          const names = (game.game_players ?? [])
            .map((gp) => gp.players?.display_name)
            .filter((n): n is string => Boolean(n));
          const trump = game.trump_suit
            ? TRUMP_SUIT_LABELS[game.trump_suit as TrumpSuit]
            : null;

          return (
            <li
              key={game.id}
              className="card-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  Started {formatInTz(game.started_at, timezone)}
                </span>
                {names.length > 0 && (
                  <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {names.join(", ")}
                    {trump ? ` · ${trump}` : ""}
                  </span>
                )}
              </div>
              <Link
                href={`/games/${game.id}/finish`}
                className="btn-brand shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
              >
                Finish →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
