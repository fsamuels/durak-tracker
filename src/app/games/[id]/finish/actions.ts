"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentGroup } from "@/lib/data/groups";
import { getGameToFinish } from "@/lib/data/games";
import { createClient } from "@/lib/supabase/server";
import {
  finishGamePayloadSchema,
  updateGamePayloadSchema,
} from "@/lib/validation/game";

export type FinishGameState = { error: string | null };

const gameIdSchema = z.guid();

/** Defense in depth: every participant must be a player in `groupId`. */
async function participantsInGroup(
  groupId: string,
  playerIds: string[],
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("group_id", groupId);
  if (error) return error.message;

  const allowed = new Set((data ?? []).map((p) => p.id));
  if (!playerIds.every((id) => allowed.has(id))) {
    return "One or more selected players aren't in this group.";
  }
  return null;
}

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

  const groupError = await participantsInGroup(
    group.id,
    data.participants.map((p) => p.playerId),
  );
  if (groupError) return { error: groupError };

  const supabase = await createClient();

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
 * Save mid-play edits to an in-progress game: reconcile the roster + any
 * outcomes (e.g. first out) and update trump/deck/notes, WITHOUT finishing it.
 * The game stays in_progress; unlike finishing, no durak is required yet.
 * Returns to the caller (no redirect) so the form can confirm + refresh.
 */
export async function updateGameAction(
  gameId: unknown,
  input: unknown,
): Promise<FinishGameState> {
  const gameIdParsed = gameIdSchema.safeParse(gameId);
  if (!gameIdParsed.success) return { error: "Invalid game." };

  const parsed = updateGamePayloadSchema.safeParse(input);
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
      error: "This game can't be updated (already finished or not found).",
    };
  }

  const groupError = await participantsInGroup(
    group.id,
    data.participants.map((p) => p.playerId),
  );
  if (groupError) return { error: groupError };

  const supabase = await createClient();

  // Single RPC: detail update + roster reconciliation in one transaction. The
  // game stays in_progress, so the deferred integrity trigger only requires
  // >= 1 player at COMMIT (no durak needed mid-play).
  const { error } = await supabase.rpc("update_game", {
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

  return { error: null };
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
