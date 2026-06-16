"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CreateGroupState = { error: string | null };

export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";

  if (!name) return { error: "Group name is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", {
    p_name: name,
    p_timezone: timezone,
    p_display_name: displayName || undefined,
  });

  if (error) return { error: error.message };

  // create_group succeeded; the user now has a group.
  redirect("/");
}
