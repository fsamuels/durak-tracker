import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getGameParticipantIds } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { getCurrentUserPlayerId, getGroupRoster } from "@/lib/data/players";

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

  const { roster } = await getGroupRoster(group.id);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
  }));

  const hasPlayers = players.length >= 1;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Start a game
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick who&apos;s in. You&apos;ll record who got stuck as the durak when
          the game wraps up.
        </p>
      </div>

      {hasPlayers ? (
        <StartGameForm players={players} preselectedIds={preselectedIds} />
      ) : (
        <div className="rounded-lg border border-dashed border-black/15 px-4 py-8 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          <p>Add some players before starting a game.</p>
          <Link
            href="/players"
            className="mt-3 inline-block font-medium text-black underline underline-offset-4 dark:text-zinc-50"
          >
            Add players →
          </Link>
        </div>
      )}
    </main>
  );
}
