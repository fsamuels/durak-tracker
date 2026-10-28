import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { HeadToHeadChart } from "@/components/charts/head-to-head-chart";
import { RecentFormSparkline } from "@/components/charts/recent-form-sparkline";
import { StatsWindowToggle } from "@/components/stats-window-toggle";
import {
  EmptyState,
  FormMessage,
  PageHeader,
  PageShell,
  Section,
  StatTile,
} from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { badgeToneClass, cx, type BadgeTone } from "@/lib/ui";
import {
  headToHeadSchema,
  parseWindow,
  playerParamSchema,
  playerStatsSchema,
  rate,
  WINDOW_LABELS,
  type GameResult,
} from "@/lib/validation/stats";

const RESULT_BADGE: Record<GameResult, { label: string; tone: BadgeTone }> = {
  durak: { label: "D", tone: "durak" },
  first_out: { label: "1", tone: "success" },
  last_out: { label: "L", tone: "warning" },
  middle: { label: "–", tone: "neutral" },
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

  const [{ data, error }, { data: h2hRaw }, avatars] = await Promise.all([
    supabase.rpc("player_stats", {
      p_group_id: group.id,
      p_player_id: playerId,
      p_window: window,
    }),
    supabase.rpc("head_to_head", {
      p_group_id: group.id,
      p_player_id: playerId,
    }),
    getGroupAvatars(group.id),
  ]);
  const parsed = error ? null : playerStatsSchema.safeParse(data);
  const stats = parsed?.success ? parsed.data : null;
  const headToHead = headToHeadSchema.safeParse(h2hRaw).data ?? [];

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/stats", label: "Group stats" }}
        media={
          <Avatar
            src={avatars.get(player.id)}
            name={player.display_name}
            size="lg"
          />
        }
        title={player.display_name}
        description={
          <>
            Stats in <span className="font-medium">{group.name}</span>.
          </>
        }
      />

      <StatsWindowToggle
        basePath={`/stats/players/${playerId}`}
        current={window}
      />

      {!stats ? (
        <FormMessage>
          Couldn&apos;t load stats{error ? `: ${error.message}` : "."}
        </FormMessage>
      ) : stats.games_played === 0 ? (
        <EmptyState>
          {window === "all"
            ? `${player.display_name} hasn't played any games yet.`
            : `${player.display_name} hasn't played any games ${WINDOW_LABELS[
                window
              ].toLowerCase()}.`}
        </EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <StatTile label="Games played" value={stats.games_played} />
            <StatTile
              label="Durak rate"
              value={rate(stats.durak_count, stats.games_played)}
              sub={`${stats.durak_count} of ${stats.games_played}`}
            />
            <StatTile
              label="First out"
              value={rate(stats.first_out_count, stats.games_played)}
              sub={`${stats.first_out_count} of ${stats.games_played}`}
            />
            <StatTile
              label="Last out"
              value={rate(stats.last_out_count, stats.games_played)}
              sub={`${stats.last_out_count} of ${stats.games_played}`}
            />
          </section>

          {stats.recent_form.length > 0 && (
            <Section
              title={
                <>
                  Recent form{" "}
                  <span className="font-normal">(latest first)</span>
                </>
              }
            >
              {/* Sparkline: oldest→newest left→right; high = durak, low = first out */}
              <RecentFormSparkline data={stats.recent_form} />
              <div className="flex flex-wrap gap-1.5">
                {stats.recent_form.map((r, i) => {
                  const badge = RESULT_BADGE[r.result];
                  return (
                    <span
                      key={`${r.started_at}-${i}`}
                      title={RESULT_TITLE[r.result]}
                      aria-label={RESULT_TITLE[r.result]}
                      className={cx(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                        badgeToneClass(badge.tone),
                      )}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          <Section
            title={
              <>
                Streaks <span className="font-normal">(all-time)</span>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Current durak streak"
                value={stats.current_durak_streak}
              />
              <StatTile
                label="Longest durak streak"
                value={stats.longest_durak_streak}
              />
              <StatTile
                label="Current win streak"
                value={stats.current_win_streak}
                sub="first out"
              />
              <StatTile
                label="Longest win streak"
                value={stats.longest_win_streak}
                sub="first out"
              />
            </div>
          </Section>

          {headToHead.length > 0 && (
            <Section
              title={
                <>
                  Head-to-head{" "}
                  <span className="font-normal">
                    (all-time · pink = me · blue = them)
                  </span>
                </>
              }
            >
              <HeadToHeadChart
                data={headToHead}
                playerName={player.display_name}
              />
            </Section>
          )}
        </>
      )}
    </PageShell>
  );
}
