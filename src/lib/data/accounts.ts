import { createAdminClient } from "@/lib/supabase/admin";

import { pickAvatarUrl } from "./avatars";

/** One external (OAuth) identity linked to an auth user. */
export type ExternalAccount = {
  /** Stable id of the auth user this identity belongs to. */
  userId: string;
  /** Primary email on the auth user, if any. */
  userEmail: string | null;
  /** Provider slug, e.g. "google" | "facebook" | "discord". */
  provider: string;
  /** Display name reported by the provider, if any. */
  name: string | null;
  /** Email reported by the provider for this identity, if any. */
  email: string | null;
  /** Profile-picture URL reported by the provider, if any. */
  avatarUrl: string | null;
  /** When this identity was first linked (ISO), if known. */
  linkedAt: string | null;
  /** Most recent sign-in via this identity (ISO), if known. */
  lastSignInAt: string | null;
};

type IdentityData = {
  email?: string;
  full_name?: string;
  name?: string;
  [key: string]: unknown;
};

type AdminListRow = {
  user_id: string;
  user_email: string | null;
  provider: string;
  identity_data: IdentityData | null;
  linked_at: string | null;
  last_sign_in_at: string | null;
};

/**
 * Lists every external authenticated account in the system, newest sign-in
 * first. Uses a SECURITY DEFINER database function rather than the GoTrue
 * Auth Admin API — the latter returns HTTP 500 on this project configuration.
 * Callers MUST confirm the requester is an admin first — see `isAdmin`.
 */
export async function listExternalAccounts(): Promise<ExternalAccount[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_list_external_accounts");
  if (error) throw error;

  return (data as AdminListRow[]).map((row) => {
    const idData = row.identity_data ?? {};
    return {
      userId: row.user_id,
      userEmail: row.user_email,
      provider: row.provider,
      name: idData.full_name ?? idData.name ?? null,
      email: idData.email ?? null,
      avatarUrl: pickAvatarUrl(idData),
      linkedAt: row.linked_at,
      lastSignInAt: row.last_sign_in_at,
    };
  });
}
