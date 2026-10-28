import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { SelectorDemoLink } from "@/components/selector-demo-link";
import { PageHeader, PageShell } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameToFinish } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";
import type { Outcome } from "@/lib/validation/game";

import { FinishGameForm } from "./finish-game-form";

const gameIdSchema = z.guid();

export default async function FinishGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = gameIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const game = await getGameToFinish(group.id, parsedId.data);
  if (!game) notFound();

  const [{ roster }, avatars] = await Promise.all([
    getGroupRoster(group.id),
    getGroupAvatars(group.id),
  ]);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: avatars.get(p.id) ?? null,
  }));

  const gamePlayers = game.game_players ?? [];
  const startedPlayerIds = gamePlayers.map((gp) => gp.player_id);

  // Outcomes saved so far (e.g. a first-out marked mid-play) prefill the form.
  const initialOutcomes: Record<string, Outcome> = {};
  for (const gp of gamePlayers) {
    initialOutcomes[gp.player_id] = gp.is_durak
      ? "durak"
      : gp.is_first_out
        ? "first_out"
        : gp.is_last_out
          ? "last_out"
          : "none";
  }

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/", label: "Home" }}
        title="Finish the game"
        description="Add or remove players, mark who went out first, and set the trump and decks. Save your changes as you go, or finish by marking the durak."
      />

      <FinishGameForm
        gameId={game.id}
        players={players}
        startedPlayerIds={startedPlayerIds}
        initialOutcomes={initialOutcomes}
        initialTrumpSuit={game.trump_suit ?? ""}
        initialDeckCount={
          game.deck_count != null ? String(game.deck_count) : ""
        }
        initialNotes={game.notes ?? ""}
      />

      <SelectorDemoLink />
    </PageShell>
  );
}
