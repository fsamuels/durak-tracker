"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { addPlayerSchema } from "@/lib/validation/player";

export type AddPlayerState = { error: string | null };

export async function addPlayerAction(input: unknown): Promise<AddPlayerState> {
  const parsed = addPlayerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found. Create a group first." };

  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({
    group_id: group.id,
    display_name: parsed.data.displayName,
  });
  if (error) return { error: error.message };

  revalidatePath("/players");
  return { error: null };
}
