import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in a group? Skip onboarding.
  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true });
  if (count && count > 0) redirect("/");

  const defaultDisplayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-5xl" aria-hidden>
          🃏
        </span>
        <h1 className="text-brand-gradient text-3xl font-bold tracking-tight">
          Create your group
        </h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          A group is a circle of friends you track Durak games with. You can add
          players (including guests) once it&apos;s created.
        </p>
      </div>
      <CreateGroupForm defaultDisplayName={defaultDisplayName} autoFocus />
    </main>
  );
}
