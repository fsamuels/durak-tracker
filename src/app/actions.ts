"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { GROUP_COOKIE } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ groupId: z.uuid() });

/** One year, in seconds — how long the active-group cookie persists. */
const GROUP_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setActiveGroupCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  groupId: string,
) {
  cookieStore.set(GROUP_COOKIE, groupId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: GROUP_COOKIE_MAX_AGE,
  });
}

/**
 * Switch the active group. Stores the choice in a cookie that `getCurrentGroup`
 * reads. We verify membership here too (RLS: the group is only visible if the
 * user belongs to it) so a forged groupId can't be persisted.
 */
export async function switchGroup(formData: FormData) {
  const parsed = schema.safeParse({ groupId: formData.get("groupId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", parsed.data.groupId)
    .maybeSingle();
  if (!group) return;

  const cookieStore = await cookies();
  setActiveGroupCookie(cookieStore, group.id);

  // Redirect (rather than revalidatePath) so the active group is re-read from a
  // fresh request that includes the cookie we just set. Re-rendering inline would
  // still see the *previous* cookie value, leaving the page on the old group.
  redirect("/");
}

export type CreateGroupState = { error: string | null };

/**
 * Create a new group (onboarding and the Manage group page). The `create_group`
 * RPC inserts the group, the owner membership, and the creator's player row;
 * we then make the new group active via the cookie so the user lands on its
 * home (a brand-new group has no games, so most-played wouldn't pick it).
 */
export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";

  if (!name) return { error: "Group name is required." };

  const supabase = await createClient();
  const { data: group, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_timezone: timezone,
    p_display_name: displayName || undefined,
  });

  if (error) return { error: error.message };

  if (group) {
    const cookieStore = await cookies();
    setActiveGroupCookie(cookieStore, group.id);
  }

  // create_group succeeded; the user now has a group.
  redirect("/");
}
