import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PageHeader, PageShell } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameToEdit } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";
import { toDatetimeLocal } from "@/lib/time";
import type { Outcome } from "@/lib/validation/game";

import { EditGameForm } from "./edit-game-form";

const gameIdSchema = z.guid();

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = gameIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const game = await getGameToEdit(group.id, parsedId.data);
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
        back={{ href: `/games/${game.id}`, label: "Game details" }}
        title="Edit game"
        description={`Correct the start and end times, trump suit, deck count, notes, and player outcomes. Times shown in ${group.timezone}.`}
      />

      <EditGameForm
        gameId={game.id}
        players={players}
        startedPlayerIds={startedPlayerIds}
        initialOutcomes={initialOutcomes}
        initialTrumpSuit={game.trump_suit ?? ""}
        initialDeckCount={
          game.deck_count != null ? String(game.deck_count) : ""
        }
        initialNotes={game.notes ?? ""}
        initialStartedAt={toDatetimeLocal(game.started_at, group.timezone)}
        initialEndedAt={
          game.ended_at ? toDatetimeLocal(game.ended_at, group.timezone) : ""
        }
      />
    </PageShell>
  );
}
