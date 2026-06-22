import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HeadToHeadChart } from "@/components/charts/head-to-head-chart";
import { RecentFormSparkline } from "@/components/charts/recent-form-sparkline";
import { StatsWindowToggle } from "@/components/stats-window-toggle";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import {
  headToHeadSchema,
  parseWindow,
  playerParamSchema,
  playerStatsSchema,
  rate,
  WINDOW_LABELS,
  type GameResult,
} from "@/lib/validation/stats";

const RESULT_BADGE: Record<GameResult, { label: string; className: string }> = {
  durak: { label: "D", className: "badge-durak" },
  first_out: {
    label: "1",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  last_out: {
    label: "L",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  middle: {
    label: "–",
    className: "bg-black/5 text-zinc-500 dark:bg-white/10",
  },
};

const RESULT_TITLE: Record<GameResult, string> = {
  durak: "Durak",
  first_out: "First out",
  last_out: "Last out (not durak)",
  middle: "Middle",
};

export default async function PlayerStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const parsedParam = playerParamSchema.safeParse(await params);
  if (!parsedParam.success) notFound();
  const { playerId } = parsedParam.data;
  const window = parseWindow((await searchParams).window);

  const supabase = await createClient();

  // RLS scopes players to the user's groups; also confirm it's in *this* group.
  const { data: player } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("id", playerId)
    .eq("group_id", group.id)
    .maybeSingle();
  if (!player) notFound();

  const [{ data, error }, { data: h2hRaw }] = await Promise.all([
    supabase.rpc("player_stats", {
      p_group_id: group.id,
      p_player_id: playerId,
      p_window: window,
    }),
    supabase.rpc("head_to_head", {
      p_group_id: group.id,
      p_player_id: playerId,
    }),
  ]);
  const parsed = error ? null : playerStatsSchema.safeParse(data);
  const stats = parsed?.success ? parsed.data : null;
  const headToHead = headToHeadSchema.safeParse(h2hRaw).data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/stats"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Group stats
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {player.display_name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Stats in <span className="font-medium">{group.name}</span>.
        </p>
      </div>

      <StatsWindowToggle
        basePath={`/stats/players/${playerId}`}
        current={window}
      />

      {!stats ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load stats{error ? `: ${error.message}` : "."}
        </p>
      ) : stats.games_played === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          {window === "all"
            ? `${player.display_name} hasn't played any games yet.`
            : `${player.display_name} hasn't played any games ${WINDOW_LABELS[
                window
              ].toLowerCase()}.`}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2">
            <Stat label="Games played" value={String(stats.games_played)} />
            <Stat
              label="Durak rate"
              value={rate(stats.durak_count, stats.games_played)}
              sub={`${stats.durak_count} of ${stats.games_played}`}
            />
            <Stat
              label="First out"
              value={rate(stats.first_out_count, stats.games_played)}
              sub={`${stats.first_out_count} of ${stats.games_played}`}
            />
            <Stat
              label="Last out"
              value={rate(stats.last_out_count, stats.games_played)}
              sub={`${stats.last_out_count} of ${stats.games_played}`}
            />
          </section>

          {stats.recent_form.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                Recent form <span className="font-normal">(latest first)</span>
              </h2>
              {/* Sparkline: oldest→newest left→right; high = durak, low = first out */}
              <RecentFormSparkline data={stats.recent_form} />
              <div className="flex flex-wrap gap-1.5">
                {stats.recent_form.map((r, i) => {
                  const badge = RESULT_BADGE[r.result];
                  return (
                    <span
                      key={`${r.started_at}-${i}`}
                      title={RESULT_TITLE[r.result]}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-500">
              Streaks <span className="font-normal">(all-time)</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Current durak streak"
                value={String(stats.current_durak_streak)}
              />
              <Stat
                label="Longest durak streak"
                value={String(stats.longest_durak_streak)}
              />
              <Stat
                label="Current win streak"
                value={String(stats.current_win_streak)}
                sub="first out"
              />
              <Stat
                label="Longest win streak"
                value={String(stats.longest_win_streak)}
                sub="first out"
              />
            </div>
          </section>

          {headToHead.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                Head-to-head{" "}
                <span className="font-normal">
                  (all-time · pink = me · blue = them)
                </span>
              </h2>
              <HeadToHeadChart
                data={headToHead}
                playerName={player.display_name}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card-surface rounded-2xl px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-black dark:text-zinc-50">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
