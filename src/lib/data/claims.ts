import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ClaimStatus = "valid" | "expired" | "claimed" | "not_found";

export type ClaimDetails = {
  status: ClaimStatus;
  groupName: string | null;
  playerName: string | null;
  /** True when the signed-in caller is already a member of the claim's group. */
  alreadyMember: boolean;
};

/**
 * Describe a claim link for the /claim/[token] landing page. Backed by the
 * SECURITY DEFINER `claim_details` RPC so it works before the claimer is a group
 * member (and for signed-out visitors, who run as the anon role). Returns a
 * coarse status plus the group + player names; never throws on a bad token.
 */
export async function getClaimDetails(token: string): Promise<ClaimDetails> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_details", {
    p_token: token,
  });

  const row = data?.[0];
  if (error || !row) {
    return {
      status: "not_found",
      groupName: null,
      playerName: null,
      alreadyMember: false,
    };
  }

  return {
    status: (row.status as ClaimStatus) ?? "not_found",
    groupName: row.group_name,
    playerName: row.player_name,
    alreadyMember: Boolean(row.already_member),
  };
}

/** A claim link's lifecycle state for the admin list. "not_found" never applies
 * here (every listed row exists), so the union is narrower than ClaimStatus. */
export type AdminClaimStatus = "valid" | "expired" | "claimed";

/** One claim link as seen by an admin, across every group. */
export type AdminPlayerClaim = {
  /** Stable id (the claim token) — used only as a list key, never displayed:
   * an unredeemed token is a live single-use credential. */
  id: string;
  status: AdminClaimStatus;
  groupName: string;
  playerName: string;
  /** Email of the member who minted the link, if still resolvable. */
  createdByEmail: string | null;
  createdAt: string;
  expiresAt: string;
  /** Email of the user who redeemed the link, if redeemed. */
  claimedByEmail: string | null;
  claimedAt: string | null;
};

type AdminClaimRow = {
  claim_id: string;
  group_name: string;
  player_name: string;
  player_linked: boolean;
  created_by_email: string | null;
  created_at: string;
  expires_at: string;
  claimed_by_email: string | null;
  claimed_at: string | null;
};

/** Derive a claim's status with the same precedence as the `claim_details` RPC:
 * a redeemed (or otherwise-linked) player reads as "claimed" even past expiry. */
function deriveAdminStatus(row: AdminClaimRow): AdminClaimStatus {
  if (row.claimed_at !== null || row.player_linked) return "claimed";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "valid";
}

/**
 * Lists every account claim link in the system, newest first. Uses the
 * `admin_list_player_claims` SECURITY DEFINER function via the service-role
 * client, since player_claims RLS otherwise scopes rows to the caller's own
 * groups. Callers MUST confirm the requester is an admin first — see `isAdmin`.
 */
export async function listAllPlayerClaims(): Promise<AdminPlayerClaim[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_list_player_claims");
  if (error) throw error;

  return (data as AdminClaimRow[]).map((row) => ({
    id: row.claim_id,
    status: deriveAdminStatus(row),
    groupName: row.group_name,
    playerName: row.player_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    claimedByEmail: row.claimed_by_email,
    claimedAt: row.claimed_at,
  }));
}
