import { redirect } from "next/navigation";

import { PageHeader, PageShell, Section } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { buttonClass } from "@/lib/ui";

import { DisplayNameForm } from "./display-name-form";
import { ProviderConnections } from "./provider-connections";
import { ThemeSelector } from "./theme-selector";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: playerRecord } = await supabase
    .from("players")
    .select("display_name")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <PageShell>
      <PageHeader
        title="Account"
        description={
          <>
            Signed in as <span className="font-medium">{user.email}</span>.
          </>
        }
      />

      <Section title="Appearance">
        <ThemeSelector />
      </Section>

      {playerRecord && (
        <Section
          title="Display name"
          description="Updates your name everywhere — every group you're in. To rename yourself in just one group, use that group's Manage group page instead."
        >
          <DisplayNameForm currentName={playerRecord.display_name} />
        </Section>
      )}

      <Section title="Sign-in methods">
        <ProviderConnections identities={user.identities ?? []} />
      </Section>

      <form action="/auth/signout" method="post" className="flex flex-col">
        <button type="submit" className={buttonClass("outline")}>
          Sign out
        </button>
      </form>
    </PageShell>
  );
}
