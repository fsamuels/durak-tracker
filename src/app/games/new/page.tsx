import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

import { LogGameForm } from "./log-game-form";

export default async function NewGamePage() {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true });

  const enoughPlayers = (players?.length ?? 0) >= 3;

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
          Log a game
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Who played, and who got stuck as the durak?
        </p>
      </div>

      {enoughPlayers ? (
        <LogGameForm players={players ?? []} />
      ) : (
        <div className="rounded-lg border border-dashed border-black/15 px-4 py-8 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          <p>You need at least 3 players to log a game.</p>
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
