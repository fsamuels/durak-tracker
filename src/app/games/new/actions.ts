"use server";

import { redirect } from "next/navigation";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { logGamePayloadSchema } from "@/lib/validation/game";

export type LogGameState = { error: string | null };

export async function logGameAction(input: unknown): Promise<LogGameState> {
  const parsed = logGamePayloadSchema.safeParse(input);
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
  // integrity triggers (>= 3 players, exactly one durak) validate at COMMIT.
  const { error } = await supabase.rpc("log_game", {
    p_group_id: group.id,
    p_participants: data.participants.map((p) => ({
      player_id: p.playerId,
      is_durak: p.isDurak,
      is_first_out: p.isFirstOut,
      is_last_out: p.isLastOut,
    })),
    p_started_at: data.startedAt,
    p_ended_at: data.endedAt ?? undefined,
    p_trump_suit: data.trumpSuit ?? undefined,
    p_deck_count: data.deckCount ?? undefined,
    p_notes: data.notes ?? undefined,
  });
  if (error) return { error: error.message };

  // No history page yet (M5); land back on home.
  redirect("/");
}
