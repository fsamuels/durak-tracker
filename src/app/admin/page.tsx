import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import { listExternalAccounts } from "@/lib/data/accounts";
import { createClient } from "@/lib/supabase/server";

// Account data must never be cached or statically rendered.
export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  discord: "Discord",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Non-admins get a 404 rather than a redirect so the area's existence isn't
  // advertised to ordinary users.
  if (!isAdmin(user)) notFound();

  let accounts: Awaited<ReturnType<typeof listExternalAccounts>> = [];
  let loadError: string | null = null;
  try {
    accounts = await listExternalAccounts();
  } catch (err) {
    const e = err as { message?: string; status?: number; code?: string };
    const parts = [
      e.status != null ? `HTTP ${e.status}` : null,
      e.code ? `[${e.code}]` : null,
      e.message ?? String(err),
    ].filter(Boolean);
    loadError = parts.join(" — ");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Admin
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Account authority tools. Visible only to admins.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-500">
            External accounts
          </h2>
          {!loadError && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every external (OAuth) identity authenticated across the system,
          newest sign-in first.
        </p>

        {loadError ? (
          <div className="card-surface rounded-2xl px-4 py-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Failed to load accounts
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {loadError}
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <p className="card-surface rounded-2xl px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No external accounts yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accounts.map((account) => (
              <li
                key={`${account.userId}:${account.provider}`}
                className="card-surface flex gap-3 rounded-2xl px-4 py-3"
              >
                <Avatar
                  src={account.avatarUrl}
                  name={
                    account.name ?? account.email ?? account.userEmail ?? "?"
                  }
                  size="lg"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                      {account.name ??
                        account.email ??
                        account.userEmail ??
                        "—"}
                    </span>
                    <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                      {PROVIDER_LABELS[account.provider] ?? account.provider}
                    </span>
                  </div>
                  {(account.email ?? account.userEmail) && (
                    <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {account.email ?? account.userEmail}
                    </span>
                  )}
                  <div className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                    <span>
                      Last sign-in: {formatDateTime(account.lastSignInAt)}
                    </span>
                    <span>Linked: {formatDateTime(account.linkedAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
