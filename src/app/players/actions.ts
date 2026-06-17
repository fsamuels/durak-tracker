"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { claimPlayerIdSchema } from "@/lib/validation/claim";
import { addPlayerSchema } from "@/lib/validation/player";

export type AddedPlayer = { id: string; display_name: string };
export type AddPlayerState = {
  error: string | null;
  /** The created player, returned so callers (e.g. the on-the-fly guest add in
   * the start/finish flows) can select it without a reload. */
  player?: AddedPlayer;
};

export async function addPlayerAction(input: unknown): Promise<AddPlayerState> {
  const parsed = addPlayerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found. Create a group first." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      group_id: group.id,
      display_name: parsed.data.displayName,
    })
    .select("id, display_name")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/players");
  return { error: null, player: data };
}

export type CreateClaimState = {
  error: string | null;
  /** The minted claim token; the client builds the absolute /claim/<token> URL
   * from window.location.origin so the share link works on any deployment. */
  token?: string;
};

/**
 * Mint a single-use, 7-day claim link for a guest player (any group member can).
 * The `create_player_claim` RPC re-checks membership (RLS) and that the player is
 * still a guest, so a forged playerId can't produce a link.
 */
export async function createPlayerClaimAction(
  playerId: unknown,
): Promise<CreateClaimState> {
  const parsed = claimPlayerIdSchema.safeParse(playerId);
  if (!parsed.success) return { error: "Invalid player." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_player_claim", {
    p_player_id: parsed.data,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Could not create a claim link." };

  return { error: null, token: data.token };
}
