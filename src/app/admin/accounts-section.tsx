"use client";

import { Avatar } from "@/components/avatar";
import type { ExternalAccount } from "@/lib/data/accounts";

import { CollapsibleSection } from "./collapsible-section";
import { EmptyCard, ErrorCard } from "./cards";
import { PROVIDER_LABELS, formatDateTime } from "./format";

/** Collapsible list of every external (OAuth) account in the system. */
export function AccountsSection({
  accounts,
  error,
}: {
  accounts: ExternalAccount[];
  error: string | null;
}) {
  const summary = error
    ? null
    : `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`;

  return (
    <CollapsibleSection
      title="External accounts"
      summary={summary}
      description="Every external (OAuth) identity authenticated across the system, newest sign-in first."
      defaultOpen={Boolean(error)}
    >
      {error ? (
        <ErrorCard title="Failed to load accounts" detail={error} />
      ) : accounts.length === 0 ? (
        <EmptyCard>No external accounts yet.</EmptyCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => (
            <li
              key={`${account.userId}:${account.provider}`}
              className="card-surface flex gap-3 rounded-2xl px-4 py-3"
            >
              <Avatar
                src={account.avatarUrl}
                name={account.name ?? account.email ?? account.userEmail ?? "?"}
                size="lg"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {account.name ?? account.email ?? account.userEmail ?? "—"}
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
    </CollapsibleSection>
  );
}
