import { notFound, redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/ui";
import { isAdmin } from "@/lib/admin";
import {
  type ExternalAccount,
  listExternalAccounts,
} from "@/lib/data/accounts";
import {
  type AdminGroupOption,
  listAdminGroupOptions,
} from "@/lib/data/admin-groups";
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
    // Group options feed the add-to-group form inside the accounts section; a
    // load failure just means empty pickers there, not a broken section.
    [groups],
  ] = await Promise.all([
    loadOr<SystemStats | null>(getSystemStats, null),
    loadOr<ExternalAccount[]>(listExternalAccounts, []),
    loadOr<AdminPlayerClaim[]>(listAllPlayerClaims, []),
    loadOr<AdminGroupOption[]>(listAdminGroupOptions, []),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Admin"
        description="Account authority tools. Visible only to admins."
      />

      <SystemStatsSection stats={stats} error={statsError} />
      <AccountsSection
        accounts={accounts}
        groups={groups}
        error={accountsError}
      />
      <ClaimsSection claims={claims} error={claimsError} />
    </PageShell>
  );
}
