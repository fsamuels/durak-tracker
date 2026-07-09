"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addUserToGroupSchema } from "@/lib/validation/admin";

export type AddUserToGroupState = {
  error?: string;
  success?: string;
} | null;

/**
 * Admin-only: add an existing auth account to a group, either linking one of
 * the group's guest players or creating a fresh player row. The real work is
 * the service-role-only `admin_add_user_to_group` RPC (one transaction for
 * the group_members + players pair); this action is its sole caller and
 * re-checks `isAdmin` — server actions are public HTTP endpoints, so the
 * page-level gate alone is not enough.
 */
export async function addUserToGroupAction(
  _prevState: AddUserToGroupState,
  formData: FormData,
): Promise<AddUserToGroupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const result = addUserToGroupSchema.safeParse({
    userId: formData.get("userId"),
    groupId: formData.get("groupId"),
    playerId: formData.get("playerId"),
    displayName: formData.get("displayName") ?? "",
  });
  if (!result.success) return { error: result.error.issues[0].message };
  const { userId, groupId, playerId, displayName } = result.data;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_add_user_to_group", {
    p_user_id: userId,
    p_group_id: groupId,
    // Either-or by design: link an existing guest, or create a named player.
    ...(playerId ? { p_player_id: playerId } : { p_display_name: displayName }),
  });

  if (error) {
    // The RPC raises human-readable messages (e.g. "User already has a player
    // in this group") — show them as-is.
    return { error: error.message || "Failed to add user to group" };
  }

  revalidatePath("/admin");
  return { success: `Added as “${data.display_name}”.` };
}
