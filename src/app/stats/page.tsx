import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz } from "@/lib/time";
import { TRUMP_SUIT_LABELS } from "@/lib/validation/game";
import { formatDuration, groupStatsSchema, rate } from "@/lib/validation/stats";

export default async function GroupStatsPage() {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_stats", {
    p_group_id: group.id,
  });

  const parsed = error ? null : groupStatsSchema.safeParse(data);
  const stats = parsed?.success ? parsed.data : null;

  const trumpTotal = stats
    ? stats.trump_frequency.reduce((sum, t) => sum + t.count, 0)
    : 0;
  const mostDurak = stats?.players.filter(
    (p) => p.durak_count > 0 && p.durak_count === stats.players[0]?.durak_count,
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Group stats
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          All-time stats for <span className="font-medium">{group.name}</span>.
          Times shown in {group.timezone}.
        </p>
      </div>

      {!stats ? (
        <p role="alert" className="text-sm text-red-600">
          Couldn&apos;t load stats{error ? `: ${error.message}` : "."}
        </p>
      ) : stats.games_played === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          No games logged yet.{" "}
          <Link
            href="/games/new"
            className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
          >
            Log a game →
          </Link>
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
            {stats.last_durak && (
              <div className="col-span-2 card-surface rounded-2xl px-4 py-3">
                <p className="text-xs text-zinc-500">Last durak</p>
                <p className="text-sm font-medium text-black dark:text-zinc-50">
                  {stats.last_durak.display_name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatInTz(stats.last_durak.started_at, group.timezone)}
                </p>
              </div>
            )}
            {mostDurak && mostDurak.length > 0 && (
              <div className="col-span-2 card-surface rounded-2xl px-4 py-3">
                <p className="text-xs text-zinc-500">
                  Most durak ({mostDurak[0].durak_count})
                </p>
                <p className="text-sm font-medium text-black dark:text-zinc-50">
                  {mostDurak.map((p) => p.display_name).join(", ")}
                </p>
              </div>
            )}
          </section>

          {/* Per-player leaderboard */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-500">Players</h2>
            <ul className="flex flex-col gap-2">
              {stats.players.map((p) => (
                <li
                  key={p.player_id}
                  className="card-surface rounded-2xl px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/stats/players/${p.player_id}`}
                      className="text-sm font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
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
                    first out {p.first_out_count} · last out {p.last_out_count}
                  </p>
                </li>
              ))}
            </ul>
            {stats.player_game_count && (
              <p className="text-xs text-zinc-500">
                Games per player — min {stats.player_game_count.min}, max{" "}
                {stats.player_game_count.max}, avg{" "}
                {stats.player_game_count.avg == null
                  ? "—"
                  : stats.player_game_count.avg.toFixed(1)}
              </p>
            )}
          </section>

          {/* Trump frequency */}
          {stats.trump_frequency.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                Trump suit frequency
              </h2>
              <ul className="flex flex-col gap-1">
                {stats.trump_frequency.map((t) => (
                  <li
                    key={t.suit}
                    className="card-surface flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-black dark:text-zinc-50"
                  >
                    <span>{TRUMP_SUIT_LABELS[t.suit]}</span>
                    <span className="text-zinc-500">
                      {t.count} · {rate(t.count, trumpTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
