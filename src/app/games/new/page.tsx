import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SelectorDemoLink } from "@/components/selector-demo-link";
import { EmptyState, PageHeader, PageShell } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameParticipantIds } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { getCurrentUserPlayerId, getGroupRoster } from "@/lib/data/players";
import { cx, linkClass } from "@/lib/ui";

import { StartGameForm } from "./start-game-form";

// `from` (a prior game id) pre-fills the roster via "Start again". z.guid() not
// z.uuid(): the DB has non-version-conformant GUIDs (seed ids) Zod rejects.
const fromSchema = z.guid();

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const { from } = await searchParams;
  const parsedFrom = fromSchema.safeParse(from);

  // Pre-select the prior game's roster ("Start again") plus the creator's own
  // player, so the person logging the game is selected by default.
  const [fromIds, selfId] = await Promise.all([
    parsedFrom.success
      ? getGameParticipantIds(group.id, parsedFrom.data)
      : Promise.resolve([]),
    getCurrentUserPlayerId(group.id),
  ]);
  const preselectedIds = [
    ...new Set([...fromIds, ...(selfId ? [selfId] : [])]),
  ];

  const [{ roster }, avatars] = await Promise.all([
    getGroupRoster(group.id),
    getGroupAvatars(group.id),
  ]);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: avatars.get(p.id) ?? null,
  }));

  const hasPlayers = players.length >= 1;

  return (
    <PageShell>
      <PageHeader
        title="Start a game"
        description="Pick who's in. You'll record who got stuck as the durak when the game wraps up."
      />

      {hasPlayers ? (
        <StartGameForm players={players} preselectedIds={preselectedIds} />
      ) : (
        <EmptyState>
          <p>Add some players before starting a game.</p>
          <Link href="/players" className={cx(linkClass, "mt-3 inline-block")}>
            Add players →
          </Link>
        </EmptyState>
      )}

      <SelectorDemoLink />
    </PageShell>
  );
}
