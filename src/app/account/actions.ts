"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(50, "Name must be 50 characters or less");

export async function updateDisplayNameAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const result = displayNameSchema.safeParse(formData.get("displayName"));
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("players")
    .update({ display_name: result.data, updated_at: new Date().toISOString() })
    .eq("auth_user_id", user.id);

  if (error) return { error: "Failed to update name" };

  // The name appears across every group (home, games, stats, players, …), not
  // just /account, so revalidate the whole tree rather than just this page.
  revalidatePath("/", "layout");
  return { success: true };
}
