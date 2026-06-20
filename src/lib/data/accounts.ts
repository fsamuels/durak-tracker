import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The external identity providers we surface as "authenticated accounts".
 * These are the OAuth providers a user can sign in with (see the login and
 * account pages); the implicit `email` identity is intentionally excluded.
 */
const EXTERNAL_PROVIDERS = ["google", "facebook", "discord"] as const;
const EXTERNAL_PROVIDER_SET = new Set<string>(EXTERNAL_PROVIDERS);

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

/**
 * Lists every external authenticated account in the system, newest sign-in
 * first. Uses the Supabase Auth Admin API (service role), so callers MUST
 * confirm the requester is an admin first — see `isAdmin`.
 */
export async function listExternalAccounts(): Promise<ExternalAccount[]> {
  const supabase = createAdminClient();

  // Fetch up to 1000 users in a single call. Passing `page` triggers
  // offset-based pagination in GoTrue which can return a "Database error
  // finding users" on some Supabase project configurations, so we omit it and
  // rely on a high perPage ceiling instead — adequate for this app's scale.
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const accounts: ExternalAccount[] = [];
  for (const user of data.users) {
    for (const identity of user.identities ?? []) {
      if (!EXTERNAL_PROVIDER_SET.has(identity.provider ?? "")) continue;

      const idData = (identity.identity_data ?? {}) as IdentityData;
      accounts.push({
        userId: user.id,
        userEmail: user.email ?? null,
        provider: identity.provider ?? "unknown",
        name: idData.full_name ?? idData.name ?? null,
        email: idData.email ?? null,
        linkedAt: identity.created_at ?? null,
        lastSignInAt: identity.last_sign_in_at ?? null,
      });
    }
  }

  accounts.sort((a, b) => {
    const at = a.lastSignInAt ? Date.parse(a.lastSignInAt) : 0;
    const bt = b.lastSignInAt ? Date.parse(b.lastSignInAt) : 0;
    return bt - at;
  });

  return accounts;
}
