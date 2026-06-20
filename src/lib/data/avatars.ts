import { createClient } from "@/lib/supabase/server";

/**
 * Picks a profile-picture URL out of a provider's identity / user metadata.
 * Google reports it as `avatar_url` (and also `picture`); other providers vary,
 * so we check both. Empty strings and non-string values are treated as absent.
 */
export function pickAvatarUrl(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  if (!meta) return null;
  for (const key of ["avatar_url", "picture"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

/**
 * Profile-picture URLs for the authenticated players in a group, keyed by
 * player id. Pulled from each linked auth user's OAuth metadata via the
 * `group_player_avatars` RPC (SECURITY DEFINER, but gated to group members), so
 * a regular member page can show avatars without the service-role key. Guests
 * and members without a picture are simply absent from the map; callers fall
 * back to initials.
 */
export async function getGroupAvatars(
  groupId: string,
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("group_player_avatars", {
    p_group_id: groupId,
  });

  const avatars = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.avatar_url) avatars.set(row.player_id, row.avatar_url);
  }
  return avatars;
}
