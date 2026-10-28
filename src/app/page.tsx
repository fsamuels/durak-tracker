import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { GameList } from "@/components/game-list";
import { InProgressGames } from "@/components/in-progress-games";
import { LandingPage } from "@/components/landing-page";
import { SuitLabel } from "@/components/suit-label";
import {
  EmptyState,
  HighlightCard,
  PageShell,
  Section,
  StatTile,
} from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameHistory, getInProgressGames } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { formatInTz } from "@/lib/time";
import { buttonClass, linkClass, nameLinkClass } from "@/lib/ui";
import {
  durakChampion,
  formatDuration,
  groupStatsSchema,
  rate,
  topTrumpSuit,
} from "@/lib/validation/stats";

// How many recent games to surface on the home page.
const RECENT_GAMES_LIMIT = 6;

const TITLE = "Durak Tracker — Free Durak Card Game Score & Stats Tracker";
const DESCRIPTION =
  "Log who was the durak (loser), the trump suit, and the players after every Durak card game, then see group and player stats — durak rate, win streaks, head-to-head. Free, mobile-friendly, installable.";

// Crawlers never carry a session, so this metadata always describes the
// signed-out LandingPage below — it's what search engines and link previews
// see, even though signed-in visitors get the dashboard instead.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Durak Tracker",
    images: ["/icons/icon-512.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <LandingPage />;

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
  const champion = stats ? durakChampion(stats.players) : null;
  const topSuit = topTrumpSuit(stats);

  return (
    <PageShell>
      <Link
        href="/group"
        className="text-brand-gradient self-start text-3xl font-bold tracking-tight underline-offset-4 hover:underline"
      >
        {group.name}
      </Link>

      {stats?.last_durak && (
        <HighlightCard
          media={
            <span aria-hidden className="text-4xl leading-none">
              🤡
            </span>
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

      <Link href="/games/new" className={buttonClass("primary")}>
        <span aria-hidden>♠️</span> Start a game
      </Link>

      <InProgressGames games={inProgress} timezone={group.timezone} />

      {gamesPlayed > 0 && (
        <Section
          title="Group stats"
          action={{ href: "/stats", label: "More stats →" }}
        >
          <div className="grid grid-cols-2 gap-3">
            {topDurak && (
              <HighlightCard
                className="col-span-2"
                media={
                  <Avatar
                    src={avatars.get(topDurak.player_id)}
                    name={topDurak.display_name}
                    size="lg"
                  />
                }
                title={
                  <Link
                    href={`/stats/players/${topDurak.player_id}`}
                    className={nameLinkClass}
                  >
                    {topDurak.display_name}
                  </Link>
                }
                caption={`most durak (${topDurak.durak_count})`}
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
            <StatTile
              highlight
              value={gamesPlayed}
              label={gamesPlayed === 1 ? "game played" : "games played"}
            />
            <StatTile
              highlight
              value={formatDuration(stats?.avg_duration_seconds ?? null)}
              label="avg game time"
            />
            <StatTile
              className="col-span-2"
              value={
                topSuit ? (
                  <SuitLabel suit={topSuit.suit} symbolClassName="text-3xl" />
                ) : (
                  "—"
                )
              }
              label={topSuit ? `top suit (${topSuit.count})` : "no trump yet"}
            />
          </div>
        </Section>
      )}

      <Section
        title="Recent games"
        action={
          games.length > 0 ? { href: "/games", label: "View all →" } : undefined
        }
      >
        <GameList
          games={games}
          timezone={group.timezone}
          emptyState={
            <EmptyState as="li">
              No games logged yet.{" "}
              <Link href="/games/new" className={linkClass}>
                Start a game →
              </Link>
            </EmptyState>
          }
        />
      </Section>
    </PageShell>
  );
}
