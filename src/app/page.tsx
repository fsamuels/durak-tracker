import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

import { switchGroup } from "./actions";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (!groups || groups.length === 0) redirect("/onboarding");

  const currentGroup = await getCurrentGroup();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Hello Durak Tracker
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Signed in as {user.email}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link
          href="/games/new"
          className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Log a game
        </Link>
        <Link
          href="/games"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5"
        >
          Game history
        </Link>
        <Link
          href="/stats"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5"
        >
          Group stats
        </Link>
        <Link
          href="/players"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5"
        >
          Manage players
        </Link>
      </div>

      <div className="w-full max-w-xs text-left">
        <h2 className="mb-2 text-sm font-medium text-zinc-500">
          Your groups
          {groups.length > 1 && (
            <span className="font-normal"> — tap to switch</span>
          )}
        </h2>
        <ul className="flex flex-col gap-1">
          {groups.map((g) => {
            const active = g.id === currentGroup?.id;
            return (
              <li key={g.id}>
                <form action={switchGroup}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <button
                    type="submit"
                    disabled={active}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                        : "border-black/10 bg-white text-black hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>{g.name}</span>
                    {active && <span className="text-xs">current</span>}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
