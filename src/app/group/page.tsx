import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { GroupDetails } from "@/components/group-details";
import { GroupSwitcher } from "@/components/group-switcher";
import { PageHeader, PageShell, Section } from "@/components/ui";
import { getCurrentGroup, getGroupDetails } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { buttonClass, linkClass } from "@/lib/ui";

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
    <PageShell>
      <PageHeader
        title="Manage group"
        description={
          <>
            Active group: <span className="font-medium">{group.name}</span>.
            Switch between your groups, manage its players, or create a new one.
          </>
        }
      />

      {details && <GroupDetails details={details} />}

      {viewerPlayer && (
        <Section
          title="Your name in this group"
          description={
            <>
              Only updates your name in{" "}
              <span className="font-medium">{group.name}</span> — other groups
              you&apos;re in keep their own name for you. To change your name
              everywhere at once, use the{" "}
              <Link href="/account" className={linkClass}>
                Account
              </Link>{" "}
              page instead.
            </>
          }
        >
          <GroupDisplayNameForm currentName={viewerPlayer.display_name} />
        </Section>
      )}

      <Section title="Switch group">
        <GroupSwitcher groups={groups ?? []} currentGroupId={group.id} />
      </Section>

      <Section title="Players">
        <Link href="/players" className={buttonClass("outline")}>
          Manage players
        </Link>
      </Section>

      <Section
        title="Create group"
        description="Start a separate group with its own players, games, and stats."
      >
        <CreateGroupForm submitLabel="Create group" />
      </Section>
    </PageShell>
  );
}
