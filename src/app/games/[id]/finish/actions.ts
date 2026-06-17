"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentGroup } from "@/lib/data/groups";
import { getGameToFinish } from "@/lib/data/games";
import { createClient } from "@/lib/supabase/server";
import { finishGamePayloadSchema } from "@/lib/validation/game";

export type FinishGameState = { error: string | null };

const gameIdSchema = z.guid();

/**
 * Finish an in-progress game: record the final roster + outcomes and flip it to
 * completed. ended_at is stamped server-side inside the RPC. The deferred
 * integrity trigger (>= 3 players, exactly one durak) validates at COMMIT.
 */
export async function finishGameAction(
  gameId: unknown,
  input: unknown,
): Promise<FinishGameState> {
  const gameIdParsed = gameIdSchema.safeParse(gameId);
  if (!gameIdParsed.success) return { error: "Invalid game." };

  const parsed = finishGamePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found." };

  // Confirm the game is in-progress and in the current group before writing.
  const game = await getGameToFinish(group.id, gameIdParsed.data);
  if (!game) {
    return {
      error: "This game can't be finished (already done or not found).",
    };
  }

  const supabase = await createClient();

  // Defense in depth: every participant must be a player in this group.
  const { data: groupPlayers, error: playersError } = await supabase
    .from("players")
    .select("id")
    .eq("group_id", group.id);
  if (playersError) return { error: playersError.message };

  const allowed = new Set((groupPlayers ?? []).map((p) => p.id));
  if (!data.participants.every((p) => allowed.has(p.playerId))) {
    return { error: "One or more selected players aren't in this group." };
  }

  // Single RPC: status flip + roster reconciliation in one transaction so the
  // deferred integrity trigger validates at COMMIT with every row in place.
  const { error } = await supabase.rpc("finish_game", {
    p_game_id: gameIdParsed.data,
    p_participants: data.participants.map((p) => ({
      player_id: p.playerId,
      is_durak: p.isDurak,
      is_first_out: p.isFirstOut,
      is_last_out: p.isLastOut,
    })),
    p_trump_suit: data.trumpSuit ?? undefined,
    p_deck_count: data.deckCount ?? undefined,
    p_notes: data.notes ?? undefined,
  });
  if (error) return { error: error.message };

  // Land on the history list so the just-finished game is visible.
  redirect("/games");
}

/**
 * Discard an in-progress game: delete it (game_players cascade). Only an
 * in_progress game in the caller's current group can be discarded; the
 * discard_game RPC + games_delete RLS policy both enforce that. Lands home.
 */
export async function discardGameAction(
  gameId: unknown,
): Promise<FinishGameState> {
  const gameIdParsed = gameIdSchema.safeParse(gameId);
  if (!gameIdParsed.success) return { error: "Invalid game." };

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found." };

  // Confirm the game is in-progress and in the current group before deleting.
  const game = await getGameToFinish(group.id, gameIdParsed.data);
  if (!game) {
    return {
      error: "This game can't be discarded (already done or not found).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_game", {
    p_game_id: gameIdParsed.data,
  });
  if (error) return { error: error.message };

  redirect("/");
}
