import Link from "next/link";
import { redirect } from "next/navigation";

import { switchGroup } from "@/app/actions";
import { CreateGroupForm } from "@/components/create-group-form";
import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

export default async function ManageGroupPage() {
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Manage group
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Switch the active group, create a new one, or manage its players.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
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
        <Link
          href="/players"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5"
        >
          Manage players
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Create a new group
        </h2>
        <CreateGroupForm submitLabel="Create group" />
      </section>
    </main>
  );
}
