import { createAdminClient } from "@/lib/supabase/admin";

/** One group as offered by the admin "add user to group" form. */
export type AdminGroupOption = {
  id: string;
  name: string;
  /** Guest players (auth_user_id IS NULL) an account could be linked to. */
  guests: { id: string; displayName: string }[];
  /** Auth user ids that already have a player row in this group. */
  linkedUserIds: string[];
};

/**
 * Every group in the system with the facts the add-user-to-group form needs:
 * its guest players (link candidates) and which accounts are already linked
 * (so their rows can be disabled per account). Spans all groups, so it uses
 * the service role. Callers MUST confirm the requester is an admin first —
 * see `isAdmin`.
 */
export async function listAdminGroupOptions(): Promise<AdminGroupOption[]> {
  const supabase = createAdminClient();

  const [groupsRes, playersRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name")
      .order("created_at", { ascending: true }),
    supabase
      .from("players")
      .select("id, group_id, display_name, auth_user_id")
      .order("display_name", { ascending: true }),
  ]);
  if (groupsRes.error) throw groupsRes.error;
  if (playersRes.error) throw playersRes.error;

  return groupsRes.data.map((group) => {
    const inGroup = playersRes.data.filter((p) => p.group_id === group.id);
    return {
      id: group.id,
      name: group.name,
      guests: inGroup
        .filter((p) => p.auth_user_id === null)
        .map((p) => ({ id: p.id, displayName: p.display_name })),
      linkedUserIds: inGroup
        .map((p) => p.auth_user_id)
        .filter((id): id is string => id !== null),
    };
  });
}
