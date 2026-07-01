"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGroup } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import { addPlayerSchema } from "@/lib/validation/player";

/**
 * Renames the signed-in user's own player row in their *active* group only —
 * unlike /account's updateDisplayNameAction, which updates the name everywhere
 * the user appears. The active group is resolved server-side (not trusted from
 * the client), and the update is scoped to that group + the caller's own
 * auth_user_id.
 */
export async function updateGroupDisplayNameAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const result = addPlayerSchema.shape.displayName.safeParse(
    formData.get("displayName"),
  );
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const group = await getCurrentGroup();
  if (!group) return { error: "No group found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("players")
    .update({ display_name: result.data, updated_at: new Date().toISOString() })
    .eq("group_id", group.id)
    .eq("auth_user_id", user.id);

  if (error) return { error: "Failed to update name" };

  // The name appears across this group's pages (home, games, stats, players),
  // so revalidate the whole tree rather than just /group.
  revalidatePath("/", "layout");
  return { success: true };
}
