import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
          Manage account
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <span className="font-medium">{user.email}</span>.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="rounded-lg border border-dashed border-black/15 px-3 py-8 text-center text-sm text-zinc-500 dark:border-white/15">
          Account settings are coming soon.
        </div>
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
