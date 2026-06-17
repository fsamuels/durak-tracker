import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

import { AddPlayerForm } from "./add-player-form";
import { ClaimLinkButton } from "./claim-link-button";

export default async function PlayersPage() {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, auth_user_id")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true });

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
          Players
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Everyone in <span className="font-medium">{group.name}</span> who can
          appear in a game. Add guests the same way — they don&apos;t need an
          account.
        </p>
      </div>

      <AddPlayerForm />

      <ul className="flex flex-col gap-2">
        {(players ?? []).map((p) => (
          <li
            key={p.id}
            className="card-surface flex items-center justify-between rounded-2xl px-3 py-2.5 text-black dark:text-zinc-50"
          >
            <Link
              href={`/stats/players/${p.id}`}
              className="underline-offset-4 hover:underline"
            >
              {p.display_name}
            </Link>
            {!p.auth_user_id && (
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  guest
                </span>
                <ClaimLinkButton playerId={p.id} playerName={p.display_name} />
              </div>
            )}
          </li>
        ))}
        {(!players || players.length === 0) && (
          <li className="rounded-2xl border border-dashed border-black/15 px-3 py-6 text-center text-sm text-zinc-500 dark:border-white/15">
            No players yet. Add a few to start logging games.
          </li>
        )}
      </ul>
    </main>
  );
}
