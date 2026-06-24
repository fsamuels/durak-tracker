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

      <Link
        href="/games/selector-demo"
        className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-base font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/20"
      >
        <SparklesIcon />
        Explore other player selection ideas →
      </Link>

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
