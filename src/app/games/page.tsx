import Link from "next/link";
import { redirect } from "next/navigation";

import { GameList } from "@/components/game-list";
import { InProgressGames } from "@/components/in-progress-games";
import {
  EmptyState,
  FormMessage,
  PageHeader,
  PageShell,
} from "@/components/ui";
import { getGameHistory, getInProgressGames } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { periodStartDate } from "@/lib/time";
import { linkClass } from "@/lib/ui";
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
    <PageShell>
      <PageHeader
        title="Game history"
        description={
          <>
            Games in <span className="font-medium">{group.name}</span>, most
            recent first. Times shown in {group.timezone}.
          </>
        }
      />

      <InProgressGames games={inProgress} timezone={group.timezone} />

      <HistoryFilter period={period} />

      {error ? (
        <FormMessage>Couldn&apos;t load games: {error.message}</FormMessage>
      ) : (
        <GameList
          games={games}
          timezone={group.timezone}
          emptyState={
            <EmptyState as="li">
              {period === "all"
                ? "No games logged yet."
                : "No games in this period."}{" "}
              <Link href="/games/new" className={linkClass}>
                Start a game →
              </Link>
            </EmptyState>
          }
        />
      )}
    </PageShell>
  );
}
