import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { GroupDetails } from "@/components/group-details";
import { GroupSwitcher } from "@/components/group-switcher";
import { getCurrentGroup, getGroupDetails } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

export default async function ManageGroupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const [{ data: groups }, details] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name")
      .order("created_at", { ascending: true }),
    getGroupDetails(group.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Manage group
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Active group: <span className="font-medium">{group.name}</span>.
          Switch between your groups, manage its players, or create a new one.
        </p>
      </div>

      {details && <GroupDetails details={details} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Switch group</h2>
        <GroupSwitcher groups={groups ?? []} currentGroupId={group.id} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Players</h2>
        <Link
          href="/players"
          className="flex h-12 items-center justify-center rounded-full border border-black/15 px-5 font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5"
        >
          Manage players
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          Create group
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Start a separate group with its own players, games, and stats.
        </p>
        <CreateGroupForm submitLabel="Create group" />
      </section>
    </main>
  );
}
