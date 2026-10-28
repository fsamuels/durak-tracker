import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { DurakRateBar } from "@/components/charts/durak-rate-bar";
import { TrumpDonut } from "@/components/charts/trump-donut";
import { StatsWindowToggle } from "@/components/stats-window-toggle";
import {
  Badge,
  EmptyState,
  FormMessage,
  HighlightCard,
  PageHeader,
  PageShell,
  Section,
  StatTile,
} from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz } from "@/lib/time";
import { cardClass, cx, linkClass, nameLinkClass } from "@/lib/ui";
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
    <PageShell>
      <PageHeader
        title="Group stats"
        description={
          <>
            {WINDOW_LABELS[window]} stats for{" "}
            <span className="font-medium">{group.name}</span>. Times shown in{" "}
            {group.timezone}.
          </>
        }
      />

      <StatsWindowToggle basePath="/stats" current={window} />

      {!stats ? (
        <FormMessage>
          Couldn&apos;t load stats{error ? `: ${error.message}` : "."}
        </FormMessage>
      ) : stats.games_played === 0 ? (
        <EmptyState>
          {window === "all" ? (
            <>
              No games logged yet.{" "}
              <Link href="/games/new" className={linkClass}>
                Start a game →
              </Link>
            </>
          ) : (
            `No games ${WINDOW_LABELS[window].toLowerCase()}.`
          )}
        </EmptyState>
      ) : (
        <>
          {/* Overview */}
          <section className="grid grid-cols-2 gap-3">
            <StatTile label="Games played" value={stats.games_played} />
            <StatTile
              label={`Avg duration${
                stats.games_with_duration < stats.games_played
                  ? ` (of ${stats.games_with_duration})`
                  : ""
              }`}
              value={formatDuration(stats.avg_duration_seconds)}
            />
            {stats.longest_game_seconds != null && (
              <StatTile
                label="Longest game"
                value={formatDuration(stats.longest_game_seconds)}
              />
            )}
            {stats.shortest_game_seconds != null && (
              <StatTile
                label="Shortest game"
                value={formatDuration(stats.shortest_game_seconds)}
              />
            )}
            {stats.last_durak && (
              <HighlightCard
                className="col-span-2"
                media={
                  <Avatar
                    src={avatars.get(stats.last_durak.player_id)}
                    name={stats.last_durak.display_name}
                    size="lg"
                  />
                }
                title={
                  <Link
                    href={`/stats/players/${stats.last_durak.player_id}`}
                    className={nameLinkClass}
                  >
                    {stats.last_durak.display_name}
                  </Link>
                }
                caption={`last durak · ${formatInTz(stats.last_durak.started_at, group.timezone)}`}
              />
            )}
            {mostDurak && mostDurak.length > 0 && (
              <HighlightCard
                className="col-span-2"
                media={
                  <div className="flex shrink-0 -space-x-2">
                    {mostDurak.map((p) => (
                      <Avatar
                        key={p.player_id}
                        src={avatars.get(p.player_id)}
                        name={p.display_name}
                        size="lg"
                        className="ring-2 ring-[var(--background)]"
                      />
                    ))}
                  </div>
                }
                title={mostDurak.map((p, i) => (
                  <span key={p.player_id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/stats/players/${p.player_id}`}
                      className={nameLinkClass}
                    >
                      {p.display_name}
                    </Link>
                  </span>
                ))}
                caption={`most durak (${mostDurak[0].durak_count})`}
              />
            )}
            {champion && (
              <HighlightCard
                className="col-span-2"
                media={
                  <Avatar
                    src={avatars.get(champion.player_id)}
                    name={champion.display_name}
                    size="lg"
                  />
                }
                title={
                  <Link
                    href={`/stats/players/${champion.player_id}`}
                    className={nameLinkClass}
                  >
                    {champion.display_name}
                  </Link>
                }
                caption={`champion 🏆 · lowest durak rate (${rate(champion.durak_count, champion.games_played)})`}
              />
            )}
            {stats.biggest_rivalry &&
              stats.biggest_rivalry.games_together > 1 && (
                <HighlightCard
                  className="col-span-2"
                  title={
                    <>
                      <Link
                        href={`/stats/players/${stats.biggest_rivalry.player_a_id}`}
                        className={nameLinkClass}
                      >
                        {stats.biggest_rivalry.player_a_name}
                      </Link>{" "}
                      <span className="font-normal text-zinc-500">vs</span>{" "}
                      <Link
                        href={`/stats/players/${stats.biggest_rivalry.player_b_id}`}
                        className={nameLinkClass}
                      >
                        {stats.biggest_rivalry.player_b_name}
                      </Link>
                    </>
                  }
                  caption={`biggest rivalry · ${stats.biggest_rivalry.games_together} games · durak ${stats.biggest_rivalry.player_a_durak_count}–${stats.biggest_rivalry.player_b_durak_count}`}
                />
              )}
            {stats.player_game_count && (
              <HighlightCard
                className="col-span-2"
                title={`min ${stats.player_game_count.min} · max ${
                  stats.player_game_count.max
                } · avg ${
                  stats.player_game_count.avg == null
                    ? "—"
                    : stats.player_game_count.avg.toFixed(1)
                }`}
                caption="games per player"
              />
            )}
          </section>

          {/* Trump frequency */}
          {stats.trump_frequency.length > 0 && (
            <Section title="Trump suit frequency">
              <TrumpDonut data={stats.trump_frequency} />
            </Section>
          )}

          {/* Per-player leaderboard — sorted by durak rate (most durak-prone) */}
          <Section title="Players · by durak rate">
            <DurakRateBar players={leaderboard} />
            <ul className="flex flex-col gap-2">
              {leaderboard.map((p) => (
                <li
                  key={p.player_id}
                  className={cx(cardClass, "flex items-center gap-3 px-4 py-3")}
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
                        className={cx(
                          nameLinkClass,
                          "truncate text-sm font-medium text-black dark:text-zinc-50",
                        )}
                      >
                        {p.display_name}
                      </Link>
                      <Badge tone="durak">
                        Durak {p.durak_count} ·{" "}
                        {rate(p.durak_count, p.games_played)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {p.games_played} game{p.games_played === 1 ? "" : "s"} ·
                      first out {p.first_out_count} · last out{" "}
                      {p.last_out_count}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </PageShell>
  );
}
