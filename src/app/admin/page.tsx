import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import {
  type ExternalAccount,
  listExternalAccounts,
} from "@/lib/data/accounts";
import {
  type AdminClaimStatus,
  type AdminPlayerClaim,
  listAllPlayerClaims,
} from "@/lib/data/claims";
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

const CLAIM_STATUS_LABELS: Record<AdminClaimStatus, string> = {
  valid: "Outstanding",
  expired: "Expired",
  claimed: "Claimed",
};

const CLAIM_STATUS_BADGE: Record<AdminClaimStatus, string> = {
  valid:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  expired:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  claimed: "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

/** Coarse human phrase for how long until / since `expires_at`. */
function formatExpiry(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absDays = Math.round(Math.abs(diffMs) / 86_400_000);
  const unit = absDays === 1 ? "day" : "days";
  if (diffMs <= 0) return `Expired ${absDays} ${unit} ago`;
  if (absDays === 0) return "Expires within a day";
  return `Expires in ${absDays} ${unit}`;
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

  let accounts: ExternalAccount[] = [];
  let loadError: string | null = null;
  try {
    accounts = await listExternalAccounts();
  } catch (err) {
    loadError = describeError(err);
  }

  let claims: AdminPlayerClaim[] = [];
  let claimsError: string | null = null;
  try {
    claims = await listAllPlayerClaims();
  } catch (err) {
    claimsError = describeError(err);
  }

  const claimCounts = claims.reduce(
    (acc, claim) => {
      acc[claim.status] += 1;
      return acc;
    },
    { valid: 0, expired: 0, claimed: 0 } as Record<AdminClaimStatus, number>,
  );

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

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Claim links</h2>
          {!claimsError && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {claims.length} {claims.length === 1 ? "link" : "links"}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every account claim link across the system, newest first. Tokens are
          never shown — an outstanding link is a live single-use credential.
        </p>

        {!claimsError && claims.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {(["valid", "expired", "claimed"] as const).map((status) => (
              <span
                key={status}
                className={`rounded-full px-2.5 py-1 font-medium ${CLAIM_STATUS_BADGE[status]}`}
              >
                {claimCounts[status]}{" "}
                {CLAIM_STATUS_LABELS[status].toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {claimsError ? (
          <div className="card-surface rounded-2xl px-4 py-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Failed to load claim links
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {claimsError}
            </p>
          </div>
        ) : claims.length === 0 ? (
          <p className="card-surface rounded-2xl px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No claim links yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="card-surface flex flex-col gap-1 rounded-2xl px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {claim.playerName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CLAIM_STATUS_BADGE[claim.status]}`}
                  >
                    {CLAIM_STATUS_LABELS[claim.status]}
                  </span>
                </div>
                <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {claim.groupName}
                </span>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                  <span>
                    Created {formatDateTime(claim.createdAt)}
                    {claim.createdByEmail ? ` by ${claim.createdByEmail}` : ""}
                  </span>
                  {claim.status === "claimed" ? (
                    <span>
                      Claimed {formatDateTime(claim.claimedAt)}
                      {claim.claimedByEmail
                        ? ` by ${claim.claimedByEmail}`
                        : ""}
                    </span>
                  ) : (
                    <span>{formatExpiry(claim.expiresAt)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
