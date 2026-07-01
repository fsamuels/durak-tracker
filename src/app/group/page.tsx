import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { GroupDetails } from "@/components/group-details";
import { GroupSwitcher } from "@/components/group-switcher";
import { getCurrentGroup, getGroupDetails } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

import { GroupDisplayNameForm } from "./group-display-name-form";

export default async function ManageGroupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const [{ data: groups }, details, { data: viewerPlayer }] = await Promise.all(
    [
      supabase
        .from("groups")
        .select("id, name")
        .order("created_at", { ascending: true }),
      getGroupDetails(group.id),
      supabase
        .from("players")
        .select("display_name")
        .eq("group_id", group.id)
        .eq("auth_user_id", user.id)
        .maybeSingle(),
    ],
  );

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

      {viewerPlayer && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">
            Your name in this group
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Only updates your name in{" "}
            <span className="font-medium">{group.name}</span> — other groups
            you&apos;re in keep their own name for you. To change your name
            everywhere at once, use the{" "}
            <Link href="/account" className="underline underline-offset-4">
              Account
            </Link>{" "}
            page instead.
          </p>
          <GroupDisplayNameForm currentName={viewerPlayer.display_name} />
        </section>
      )}

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
