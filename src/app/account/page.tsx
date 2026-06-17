import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Account
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <span className="font-medium">{user.email}</span>.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Appearance</h2>
        <ThemeSelector />
      </section>

      {playerRecord && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Display name</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Shown across all your groups.
          </p>
          <DisplayNameForm currentName={playerRecord.display_name} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Sign-in methods</h2>
        <ProviderConnections identities={user.identities ?? []} />
      </section>

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
