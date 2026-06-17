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
