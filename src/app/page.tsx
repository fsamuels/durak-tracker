import Link from "next/link";
import { redirect } from "next/navigation";

import { GameList } from "@/components/game-list";
import { InProgressGames } from "@/components/in-progress-games";
import { getGameHistory, getInProgressGames } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, groupStatsSchema } from "@/lib/validation/stats";

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

  const [{ games }, { games: inProgress }, { data: statsRaw }] =
    await Promise.all([
      getGameHistory({
        groupId: group.id,
        timezone: group.timezone,
        limit: RECENT_GAMES_LIMIT,
      }),
      getInProgressGames(group.id),
      supabase.rpc("group_stats", { p_group_id: group.id }),
    ]);

  const stats = groupStatsSchema.safeParse(statsRaw).data ?? null;
  const gamesPlayed = stats?.games_played ?? 0;
  // `players` comes back sorted by durak_count desc, so the leader is first.
  const topDurak = stats?.players.find((p) => p.durak_count > 0) ?? null;

  return (
    <main className="app-bg mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href="/group"
            className="text-brand-gradient text-3xl font-bold tracking-tight underline-offset-4 hover:underline"
          >
            {group.name}
          </Link>
          <Link
            href="/group/switch"
            className="shrink-0 text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Change group →
          </Link>
        </div>
      </div>

      <Link
        href="/games/new"
        className="btn-brand flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold"
      >
        <span aria-hidden>♠️</span> Start a game
      </Link>

      <InProgressGames games={inProgress} timezone={group.timezone} />

      {stats?.last_durak && (
        <div className="-mt-4 flex flex-col gap-1">
          <h2 className="text-sm font-medium text-zinc-500">🤡 Last durak</h2>
          <p className="truncate text-lg font-semibold text-black dark:text-zinc-50">
            {stats.last_durak.display_name}
          </p>
        </div>
      )}

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
                {topDurak ? topDurak.display_name : "—"}
              </span>
              <span className="text-xs font-medium text-zinc-500">
                {topDurak
                  ? `most durak (${topDurak.durak_count})`
                  : "no durak yet"}
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
            <li className="rounded-lg border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
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

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Sign out as {user.email}
        </button>
      </form>
    </main>
  );
}
