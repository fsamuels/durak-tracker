"use client";

import { useMemo, useState } from "react";

import type { AdminClaimStatus, AdminPlayerClaim } from "@/lib/data/claims";

import { CollapsibleSection } from "./collapsible-section";
import { EmptyCard, ErrorCard } from "./cards";
import {
  CLAIM_STATUS_BADGE,
  CLAIM_STATUS_LABELS,
  formatDateTime,
  formatExpiry,
} from "./format";

type ClaimFilter = "all" | AdminClaimStatus;

const STATUS_ORDER: readonly AdminClaimStatus[] = [
  "valid",
  "expired",
  "claimed",
];

/** Per-status counts for the filter chips (0-filled for statuses with no rows). */
export function claimStatusCounts(
  claims: AdminPlayerClaim[],
): Record<AdminClaimStatus, number> {
  return claims.reduce(
    (acc, claim) => {
      acc[claim.status] += 1;
      return acc;
    },
    { valid: 0, expired: 0, claimed: 0 } as Record<AdminClaimStatus, number>,
  );
}

/** Collapsible, status-filterable list of every claim link in the system. */
export function ClaimsSection({
  claims,
  error,
}: {
  claims: AdminPlayerClaim[];
  error: string | null;
}) {
  const [filter, setFilter] = useState<ClaimFilter>("all");

  const counts = useMemo(() => claimStatusCounts(claims), [claims]);
  const visible = useMemo(
    () =>
      filter === "all" ? claims : claims.filter((c) => c.status === filter),
    [claims, filter],
  );

  const summary = error
    ? null
    : `${claims.length} ${claims.length === 1 ? "link" : "links"}`;

  return (
    <CollapsibleSection
      title="Claim links"
      summary={summary}
      description="Every account claim link across the system, newest first. Tokens are never shown — an outstanding link is a live single-use credential."
      defaultOpen={Boolean(error)}
    >
      {error ? (
        <ErrorCard title="Failed to load claim links" detail={error} />
      ) : claims.length === 0 ? (
        <EmptyCard>No claim links yet.</EmptyCard>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              className={
                filter === "all"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : ""
              }
            >
              All {claims.length}
            </FilterChip>
            {STATUS_ORDER.map((status) => (
              <FilterChip
                key={status}
                active={filter === status}
                onClick={() => setFilter(status)}
                className={filter === status ? CLAIM_STATUS_BADGE[status] : ""}
              >
                {counts[status]} {CLAIM_STATUS_LABELS[status].toLowerCase()}
              </FilterChip>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyCard>
              No {CLAIM_STATUS_LABELS[filter as AdminClaimStatus].toLowerCase()}{" "}
              links.
            </EmptyCard>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((claim) => (
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
                      {claim.createdByEmail
                        ? ` by ${claim.createdByEmail}`
                        : ""}
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
        </>
      )}
    </CollapsibleSection>
  );
}

function FilterChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const base = className
    ? className
    : "bg-black/5 text-zinc-500 hover:text-zinc-700 dark:bg-white/10 dark:text-zinc-400 dark:hover:text-zinc-200";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 font-medium transition ${base}`}
    >
      {children}
    </button>
  );
}
