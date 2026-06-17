"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { GROUP_COOKIE } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { claimTokenSchema } from "@/lib/validation/claim";

export type ClaimState = { error: string | null };

/** One year, in seconds — how long the active-group cookie persists. */
const GROUP_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Redeem a claim link: link the guest player to the signed-in account and join
 * the group, via the SECURITY DEFINER `claim_player` RPC. On success we make the
 * newly-joined group active (cookie) so home lands there, then revalidate the
 * client cache. Returns the RPC's message for the expired / already-claimed /
 * already-a-member edge cases so the page can show them.
 */
export async function claimPlayerAction(token: unknown): Promise<ClaimState> {
  const parsed = claimTokenSchema.safeParse(token);
  if (!parsed.success) return { error: "Invalid claim link." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to claim this player." };

  const { data: group, error } = await supabase.rpc("claim_player", {
    p_token: parsed.data,
  });
  if (error) return { error: error.message };

  if (group) {
    const cookieStore = await cookies();
    cookieStore.set(GROUP_COOKIE, group.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: GROUP_COOKIE_MAX_AGE,
    });
  }

  // The claimer is now a member with access to new groups/games/stats; purge the
  // client Router Cache so home re-renders for the freshly-joined group.
  revalidatePath("/", "layout");
  return { error: null };
}
