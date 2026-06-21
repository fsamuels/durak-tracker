import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { GameList } from "@/components/game-list";
import { InProgressGames } from "@/components/in-progress-games";
import { SuitLabel } from "@/components/suit-label";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameHistory, getInProgressGames } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz } from "@/lib/time";
import {
  formatDuration,
  groupStatsSchema,
  topTrumpSuit,
} from "@/lib/validation/stats";

// How many recent games to surface on the home page.
const RECENT_GAMES_LIMIT = 6;

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const [{ games }, { games: inProgress }, { data: statsRaw }, avatars] =
    await Promise.all([
      getGameHistory({
        groupId: group.id,
        timezone: group.timezone,
        limit: RECENT_GAMES_LIMIT,
      }),
      getInProgressGames(group.id),
      supabase.rpc("group_stats", { p_group_id: group.id }),
      getGroupAvatars(group.id),
    ]);

  const stats = groupStatsSchema.safeParse(statsRaw).data ?? null;
  const gamesPlayed = stats?.games_played ?? 0;
  // `players` comes back sorted by durak_count desc, so the leader is first.
  const topDurak = stats?.players.find((p) => p.durak_count > 0) ?? null;
  const topSuit = topTrumpSuit(stats);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <Link
        href="/group"
        className="text-brand-gradient text-3xl font-bold tracking-tight underline-offset-4 hover:underline"
      >
        {group.name}
      </Link>

      {stats?.last_durak && (
        <div className="card-surface flex items-stretch gap-4 rounded-2xl px-4 py-3">
          <span
            aria-hidden
            className="flex items-center self-stretch text-5xl leading-none"
          >
            🤡
          </span>
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <Link
              href={`/stats/players/${stats.last_durak.player_id}`}
              className="truncate text-xl font-bold tracking-tight text-black underline-offset-4 hover:underline dark:text-zinc-50"
            >
              {stats.last_durak.display_name}
            </Link>
            <span className="text-xs font-medium text-zinc-500">
              last durak ·{" "}
              {formatInTz(stats.last_durak.started_at, group.timezone)}
            </span>
          </div>
        </div>
      )}

      <Link
        href="/games/new"
        className="btn-brand flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold"
      >
        <span aria-hidden>♠️</span> Start a game
      </Link>

      <InProgressGames games={inProgress} timezone={group.timezone} />

      {gamesPlayed > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-zinc-500">Group stats</h2>
            <Link
              href="/stats"
              className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            >
              More stats →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-surface col-span-2 flex items-center gap-3 rounded-2xl px-4 py-3">
              {topDurak && (
                <Avatar
                  src={avatars.get(topDurak.player_id)}
                  name={topDurak.display_name}
                  size="lg"
                />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-xl font-bold tracking-tight text-black dark:text-zinc-50">
                  {topDurak ? topDurak.display_name : "—"}
                </span>
                <span className="text-xs font-medium text-zinc-500">
                  {topDurak
                    ? `most durak (${topDurak.durak_count})`
                    : "no durak yet"}
                </span>
              </div>
            </div>
            <div className="card-surface flex flex-col gap-1 rounded-2xl px-4 py-3">
              <span className="text-brand-gradient text-3xl font-bold tracking-tight">
                {gamesPlayed}
              </span>
              <span className="text-xs font-medium text-zinc-500">
                {gamesPlayed === 1 ? "game played" : "games played"}
              </span>
            </div>
            <div className="card-surface flex flex-col gap-1 rounded-2xl px-4 py-3">
              <span className="text-brand-gradient text-3xl font-bold tracking-tight">
                {formatDuration(stats?.avg_duration_seconds ?? null)}
              </span>
              <span className="text-xs font-medium text-zinc-500">
                avg game time
              </span>
            </div>
            <div className="card-surface col-span-2 flex flex-col gap-1 rounded-2xl px-4 py-3">
              <span className="truncate text-xl font-bold tracking-tight text-black dark:text-zinc-50">
                {topSuit ? (
                  <SuitLabel suit={topSuit.suit} symbolClassName="text-3xl" />
                ) : (
                  "—"
                )}
              </span>
              <span className="text-xs font-medium text-zinc-500">
                {topSuit ? `top suit (${topSuit.count})` : "no trump yet"}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Recent games</h2>
          {games.length > 0 && (
            <Link
              href="/games"
              className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            >
              View all →
            </Link>
          )}
        </div>
        <GameList
          games={games}
          timezone={group.timezone}
          emptyState={
            <li className="rounded-2xl border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
              No games logged yet.{" "}
              <Link
                href="/games/new"
                className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
              >
                Start a game →
              </Link>
            </li>
          }
        />
      </section>
    </main>
  );
}
