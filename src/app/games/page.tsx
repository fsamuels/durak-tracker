import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz, zonedDayEndUtc, zonedDayStartUtc } from "@/lib/time";
import { TRUMP_SUIT_LABELS, type TrumpSuit } from "@/lib/validation/game";
import { historyFilterSchema } from "@/lib/validation/history";

import { HistoryFilter } from "./history-filter";

// Simple cap for v1; pagination is deferred (see docs/current-status.md).
const GAMES_LIMIT = 100;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const parsed = historyFilterSchema.safeParse(await searchParams);
  const filter = parsed.success ? parsed.data : {};
  const filterError = parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? "Invalid date range.");

  const supabase = await createClient();
  let query = supabase
    .from("games")
    .select(
      `id, started_at, ended_at, trump_suit, deck_count,
       game_players ( is_durak, players ( display_name ) )`,
    )
    .eq("group_id", group.id)
    .order("started_at", { ascending: false })
    .limit(GAMES_LIMIT);

  if (filter.start) {
    query = query.gte(
      "started_at",
      zonedDayStartUtc(filter.start, group.timezone),
    );
  }
  if (filter.end) {
    query = query.lt("started_at", zonedDayEndUtc(filter.end, group.timezone));
  }

  const { data: games, error } = await query;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Game history
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Games in <span className="font-medium">{group.name}</span>, most
          recent first. Times shown in {group.timezone}.
        </p>
      </div>

      <HistoryFilter start={filter.start} end={filter.end} />

      {filterError && (
        <p role="alert" className="text-sm text-red-600">
          {filterError}
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load games: {error.message}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(games ?? []).map((game) => {
            const participants = game.game_players ?? [];
            const names = participants
              .map((gp) => gp.players?.display_name)
              .filter((n): n is string => Boolean(n));
            const durak = participants.find((gp) => gp.is_durak)?.players
              ?.display_name;
            const trump = game.trump_suit
              ? TRUMP_SUIT_LABELS[game.trump_suit as TrumpSuit]
              : null;

            return (
              <li
                key={game.id}
                className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-900"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {formatInTz(game.started_at, group.timezone)}
                  </span>
                  {durak && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
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
              </li>
            );
          })}

          {(!games || games.length === 0) && (
            <li className="rounded-lg border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
              {filter.start || filter.end
                ? "No games in this date range."
                : "No games logged yet."}{" "}
              <Link
                href="/games/new"
                className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
              >
                Log a game →
              </Link>
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
