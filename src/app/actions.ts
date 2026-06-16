"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { GROUP_COOKIE } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ groupId: z.uuid() });

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
  cookieStore.set(GROUP_COOKIE, group.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Redirect (rather than revalidatePath) so the active group is re-read from a
  // fresh request that includes the cookie we just set. Re-rendering inline would
  // still see the *previous* cookie value, leaving the page on the old group.
  redirect("/");
}
