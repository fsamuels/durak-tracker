import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

      <div className="w-full max-w-xs text-left">
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Your groups</h2>
        <ul className="flex flex-col gap-1">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {g.name}
            </li>
          ))}
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
