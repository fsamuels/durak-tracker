import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { TrumpDonut } from "@/components/charts/trump-donut";
import { StatsWindowToggle } from "@/components/stats-window-toggle";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz } from "@/lib/time";
import {
  byDurakRateDesc,
  durakChampion,
  formatDuration,
  groupStatsSchema,
  parseWindow,
  rate,
  WINDOW_LABELS,
} from "@/lib/validation/stats";

export default async function GroupStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const window = parseWindow((await searchParams).window);

  const supabase = await createClient();
  const [{ data, error }, avatars] = await Promise.all([
    supabase.rpc("group_stats", { p_group_id: group.id, p_window: window }),
    getGroupAvatars(group.id),
  ]);

  const parsed = error ? null : groupStatsSchema.safeParse(data);
  const stats = parsed?.success ? parsed.data : null;

  const mostDurak = stats?.players.filter(
    (p) => p.durak_count > 0 && p.durak_count === stats.players[0]?.durak_count,
  );
  // Leaderboard re-sorted by durak rate (the RPC orders by raw count); the
  // champion is the lowest-rate player among those with enough games.
  const leaderboard = stats ? [...stats.players].sort(byDurakRateDesc) : [];
  const champion = stats ? durakChampion(stats.players) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Group stats
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {WINDOW_LABELS[window]} stats for{" "}
          <span className="font-medium">{group.name}</span>. Times shown in{" "}
          {group.timezone}.
        </p>
      </div>

      <StatsWindowToggle basePath="/stats" current={window} />

      {!stats ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load stats{error ? `: ${error.message}` : "."}
        </p>
      ) : stats.games_played === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          {window === "all" ? (
            <>
              No games logged yet.{" "}
              <Link
                href="/games/new"
                className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
              >
                Log a game →
              </Link>
            </>
          ) : (
            `No games ${WINDOW_LABELS[window].toLowerCase()}.`
          )}
        </div>
      ) : (
        <>
          {/* Overview */}
          <section className="grid grid-cols-2 gap-2">
            <Stat label="Games played" value={String(stats.games_played)} />
            <Stat
              label={`Avg duration${
                stats.games_with_duration < stats.games_played
                  ? ` (of ${stats.games_with_duration})`
                  : ""
              }`}
              value={formatDuration(stats.avg_duration_seconds)}
            />
            {stats.longest_game_seconds != null && (
              <Stat
                label="Longest game"
                value={formatDuration(stats.longest_game_seconds)}
              />
            )}
            {stats.shortest_game_seconds != null && (
              <Stat
                label="Shortest game"
                value={formatDuration(stats.shortest_game_seconds)}
              />
            )}
            {stats.last_durak && (
              <div className="col-span-2 card-surface flex items-center gap-3 rounded-2xl px-4 py-3">
                <Avatar
                  src={avatars.get(stats.last_durak.player_id)}
                  name={stats.last_durak.display_name}
                />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Last durak</p>
                  <Link
                    href={`/stats/players/${stats.last_durak.player_id}`}
                    className="block truncate text-sm font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
                  >
                    {stats.last_durak.display_name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {formatInTz(stats.last_durak.started_at, group.timezone)}
                  </p>
                </div>
              </div>
            )}
            {mostDurak && mostDurak.length > 0 && (
              <div className="col-span-2 card-surface flex items-center gap-3 rounded-2xl px-4 py-3">
                <div className="flex shrink-0 -space-x-2">
                  {mostDurak.map((p) => (
                    <Avatar
                      key={p.player_id}
                      src={avatars.get(p.player_id)}
                      name={p.display_name}
                      className="ring-2 ring-[var(--background)]"
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">
                    Most durak ({mostDurak[0].durak_count})
                  </p>
                  <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {mostDurak.map((p, i) => (
                      <span key={p.player_id}>
                        {i > 0 && ", "}
                        <Link
                          href={`/stats/players/${p.player_id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {p.display_name}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}
            {champion && (
              <div className="col-span-2 card-surface flex items-center gap-3 rounded-2xl px-4 py-3">
                <Avatar
                  src={avatars.get(champion.player_id)}
                  name={champion.display_name}
                />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">
                    Champion 🏆 (lowest durak rate ·{" "}
                    {rate(champion.durak_count, champion.games_played)})
                  </p>
                  <Link
                    href={`/stats/players/${champion.player_id}`}
                    className="block truncate text-sm font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
                  >
                    {champion.display_name}
                  </Link>
                </div>
              </div>
            )}
            {stats.biggest_rivalry &&
              stats.biggest_rivalry.games_together > 1 && (
                <div className="col-span-2 card-surface rounded-2xl px-4 py-3">
                  <p className="text-xs text-zinc-500">
                    Biggest rivalry · {stats.biggest_rivalry.games_together}{" "}
                    games
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-black dark:text-zinc-50">
                    <Link
                      href={`/stats/players/${stats.biggest_rivalry.player_a_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {stats.biggest_rivalry.player_a_name}
                    </Link>{" "}
                    <span className="text-zinc-500">vs</span>{" "}
                    <Link
                      href={`/stats/players/${stats.biggest_rivalry.player_b_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {stats.biggest_rivalry.player_b_name}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    durak {stats.biggest_rivalry.player_a_durak_count}–
                    {stats.biggest_rivalry.player_b_durak_count}
                  </p>
                </div>
              )}
            {stats.player_game_count && (
              <div className="col-span-2 card-surface rounded-2xl px-4 py-3">
                <p className="text-xs text-zinc-500">Games per player</p>
                <p className="mt-0.5 text-sm font-medium text-black dark:text-zinc-50">
                  min {stats.player_game_count.min} · max{" "}
                  {stats.player_game_count.max} · avg{" "}
                  {stats.player_game_count.avg == null
                    ? "—"
                    : stats.player_game_count.avg.toFixed(1)}
                </p>
              </div>
            )}
          </section>

          {/* Trump frequency */}
          {stats.trump_frequency.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                Trump suit frequency
              </h2>
              <TrumpDonut data={stats.trump_frequency} />
            </section>
          )}

          {/* Per-player leaderboard — sorted by durak rate (most durak-prone) */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-500">
              Players · by durak rate
            </h2>
            <ul className="flex flex-col gap-2">
              {leaderboard.map((p) => (
                <li
                  key={p.player_id}
                  className="card-surface flex items-center gap-3 rounded-2xl px-4 py-3"
                >
                  <Avatar
                    src={avatars.get(p.player_id)}
                    name={p.display_name}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/stats/players/${p.player_id}`}
                        className="truncate text-sm font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
                      >
                        {p.display_name}
                      </Link>
                      <span className="badge-durak shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                        Durak {p.durak_count} ·{" "}
                        {rate(p.durak_count, p.games_played)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {p.games_played} game{p.games_played === 1 ? "" : "s"} ·
                      first out {p.first_out_count} · last out{" "}
                      {p.last_out_count}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-2xl px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-black dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
