import type { AdminClaimStatus } from "@/lib/data/claims";
import { badgeToneClass } from "@/lib/ui";

export const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  discord: "Discord",
};

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Coarse human phrase for how long until / since `expires_at`. */
export function formatExpiry(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absDays = Math.round(Math.abs(diffMs) / 86_400_000);
  const unit = absDays === 1 ? "day" : "days";
  if (diffMs <= 0) return `Expired ${absDays} ${unit} ago`;
  if (absDays === 0) return "Expires within a day";
  return `Expires in ${absDays} ${unit}`;
}

export const CLAIM_STATUS_LABELS: Record<AdminClaimStatus, string> = {
  valid: "Outstanding",
  expired: "Expired",
  claimed: "Claimed",
};

export const CLAIM_STATUS_BADGE: Record<AdminClaimStatus, string> = {
  valid: badgeToneClass("success"),
  expired: badgeToneClass("warning"),
  claimed: badgeToneClass("neutral"),
};
