"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { localDatetimeToUtc } from "@/lib/time";
import { editGamePayloadSchema } from "@/lib/validation/game";

export type EditGameState = { error: string | null };

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
 * Save edits to a completed game: update timestamps, details, and player
 * outcomes via the edit_completed_game RPC (one transaction so the integrity
 * trigger validates at COMMIT). Only the original logger (logged_by) may edit;
 * this is enforced both here (explicit auth check) and by the RPC.
 */
export async function editGameAction(
  gameId: unknown,
  input: unknown,
): Promise<EditGameState> {
  const gameIdParsed = gameIdSchema.safeParse(gameId);
  if (!gameIdParsed.success) return { error: "Invalid game." };

  const parsed = editGamePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found." };

  const groupError = await participantsInGroup(
    group.id,
    data.participants.map((p) => p.playerId),
  );
  if (groupError) return { error: groupError };

  // Convert datetime-local strings (in group's timezone) to UTC instants.
  const startedAt = localDatetimeToUtc(data.startedAt, group.timezone);
  const endedAt = localDatetimeToUtc(data.endedAt, group.timezone);

  // Double-check ordering after timezone conversion (schema also checks).
  if (new Date(endedAt) < new Date(startedAt)) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_completed_game", {
    p_game_id: gameIdParsed.data,
    p_participants: data.participants.map((p) => ({
      player_id: p.playerId,
      is_durak: p.isDurak,
      is_first_out: p.isFirstOut,
      is_last_out: p.isLastOut,
    })),
    p_started_at: startedAt,
    p_ended_at: endedAt,
    p_trump_suit: data.trumpSuit ?? undefined,
    p_deck_count: data.deckCount ?? undefined,
    p_notes: data.notes ?? undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/games");
  revalidatePath("/");
  redirect("/games");
}

/**
 * Soft-delete a completed game by setting deleted_at = now(). Only the original
 * logger may delete; enforced server-side (explicit logged_by check) and by RLS
 * (games_soft_delete policy). Redirects to /games after deletion.
 */
export async function deleteGameAction(
  gameId: unknown,
): Promise<EditGameState> {
  const gameIdParsed = gameIdSchema.safeParse(gameId);
  if (!gameIdParsed.success) return { error: "Invalid game." };

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("games")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", gameIdParsed.data)
    .eq("group_id", group.id)
    .eq("status", "completed")
    .eq("logged_by", user.id)
    .is("deleted_at", null)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return {
      error: "Game not found or you don't have permission to delete it.",
    };
  }

  revalidatePath("/games");
  revalidatePath("/");
  redirect("/games");
}
