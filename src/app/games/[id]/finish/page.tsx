import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

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

  const { roster } = await getGroupRoster(group.id);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Finish the game
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add or remove players, mark who went out first, and set the trump and
          decks. Save your changes as you go, or finish by marking the durak.
        </p>
      </div>

      <Link
        href="/games/selector-demo"
        className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-base font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/20"
      >
        <SparklesIcon />
        Explore other player selection ideas →
      </Link>

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
    </main>
  );
}

function SparklesIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}
