"use server";

import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { startGamePayloadSchema } from "@/lib/validation/game";

export type StartGameState = { error: string | null };

/**
 * Start a game: create it in_progress with a starting roster (>= 1 player).
 * Outcomes and the end time come later, via finish_game. started_at is stamped
 * server-side inside the RPC.
 */
export async function startGameAction(input: unknown): Promise<StartGameState> {
  const parsed = startGamePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found. Create a group first." };

  const supabase = await createClient();

  // Defense in depth: every participant must be a player in this group. (RLS
  // gates game membership but not which player_ids a game references.)
  const { data: groupPlayers, error: playersError } = await supabase
    .from("players")
    .select("id")
    .eq("group_id", group.id);
  if (playersError) return { error: playersError.message };

  const allowed = new Set((groupPlayers ?? []).map((p) => p.id));
  if (!data.participants.every((p) => allowed.has(p.playerId))) {
    return { error: "One or more selected players aren't in this group." };
  }

  // Single RPC: game + its players insert in one transaction so the deferred
  // integrity trigger (>= 1 player for in_progress) validates at COMMIT.
  const { error } = await supabase.rpc("start_game", {
    p_group_id: group.id,
    p_participants: data.participants.map((p) => ({ player_id: p.playerId })),
    p_trump_suit: data.trumpSuit ?? undefined,
    p_deck_count: data.deckCount ?? undefined,
    p_notes: data.notes ?? undefined,
  });
  if (error) return { error: error.message };

  // Back to home, where the in-progress game shows with a Finish CTA.
  redirect("/");
}
