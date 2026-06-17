import Link from "next/link";
import { redirect } from "next/navigation";

import { GameList } from "@/components/game-list";
import { InProgressGames } from "@/components/in-progress-games";
import { getGameHistory, getInProgressGames } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { periodStartDate } from "@/lib/time";
import { historyFilterSchema } from "@/lib/validation/history";

import { HistoryFilter } from "./history-filter";

// Simple cap for v1; pagination is deferred (see docs/current-status.md).
const GAMES_LIMIT = 100;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  // `.catch` in the schema means this always succeeds, falling back to month.
  const { period } = historyFilterSchema.parse(await searchParams);
  const start = periodStartDate(period, group.timezone);

  const [{ games, error }, { games: inProgress }] = await Promise.all([
    getGameHistory({
      groupId: group.id,
      timezone: group.timezone,
      start,
      limit: GAMES_LIMIT,
    }),
    getInProgressGames(group.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Game history
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Games in <span className="font-medium">{group.name}</span>, most
          recent first. Times shown in {group.timezone}.
        </p>
      </div>

      <InProgressGames games={inProgress} timezone={group.timezone} />

      <HistoryFilter period={period} />

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load games: {error.message}
        </p>
      ) : (
        <GameList
          games={games}
          timezone={group.timezone}
          emptyState={
            <li className="rounded-2xl border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
              {period === "all"
                ? "No games logged yet."
                : "No games in this period."}{" "}
              <Link
                href="/games/new"
                className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
              >
                Start a game →
              </Link>
            </li>
          }
        />
      )}
    </main>
  );
}
