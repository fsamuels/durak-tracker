import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getGameToFinish } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";

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

  const { roster } = await getGroupRoster(group.id);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
  }));

  const startedPlayerIds = (game.game_players ?? []).map((gp) => gp.player_id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Finish the game
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Confirm who played, add any latecomers, and mark who got stuck as the
          durak.
        </p>
      </div>

      <FinishGameForm
        gameId={game.id}
        players={players}
        startedPlayerIds={startedPlayerIds}
        initialTrumpSuit={game.trump_suit ?? ""}
        initialDeckCount={
          game.deck_count != null ? String(game.deck_count) : ""
        }
        initialNotes={game.notes ?? ""}
      />
    </main>
  );
}
