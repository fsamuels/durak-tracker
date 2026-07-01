import { notFound, redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import {
  type ExternalAccount,
  listExternalAccounts,
} from "@/lib/data/accounts";
import { type AdminPlayerClaim, listAllPlayerClaims } from "@/lib/data/claims";
import { type SystemStats, getSystemStats } from "@/lib/data/system";
import { createClient } from "@/lib/supabase/server";

import { AccountsSection } from "./accounts-section";
import { ClaimsSection } from "./claims-section";
import { SystemStats as SystemStatsSection } from "./system-stats";

// Account data must never be cached or statically rendered.
export const dynamic = "force-dynamic";

function describeError(err: unknown): string {
  const e = err as { message?: string; status?: number; code?: string };
  return [
    e.status != null ? `HTTP ${e.status}` : null,
    e.code ? `[${e.code}]` : null,
    e.message ?? String(err),
  ]
    .filter(Boolean)
    .join(" — ");
}

/** Run a loader, returning its data or a formatted error string (never throws). */
async function loadOr<T>(
  loader: () => Promise<T>,
  fallback: T,
): Promise<[T, string | null]> {
  try {
    return [await loader(), null];
  } catch (err) {
    return [fallback, describeError(err)];
  }
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

  const [
    [stats, statsError],
    [accounts, accountsError],
    [claims, claimsError],
  ] = await Promise.all([
    loadOr<SystemStats | null>(getSystemStats, null),
    loadOr<ExternalAccount[]>(listExternalAccounts, []),
    loadOr<AdminPlayerClaim[]>(listAllPlayerClaims, []),
  ]);

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

      <SystemStatsSection stats={stats} error={statsError} />
      <AccountsSection accounts={accounts} error={accountsError} />
      <ClaimsSection claims={claims} error={claimsError} />
    </main>
  );
}
