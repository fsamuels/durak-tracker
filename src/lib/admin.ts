import type { User } from "@supabase/supabase-js";

/**
 * Account-authority (admin) access control.
 *
 * Admins can reach the `/admin` area and its privileged, system-wide views.
 * For now membership is a hard-coded email allowlist — the simplest thing that
 * works for a single operator. The roadmap is to promote this into a real
 * "account authority" concept stored in the database (e.g. an `is_admin` flag
 * or an `account_authorities` table); when that lands, `isAdmin` becomes the
 * single place to swap the lookup without touching call sites.
 */
export const ADMIN_EMAILS = ["fsamuels@gmail.com"] as const;

/** True when the signed-in user is an account authority (admin). */
export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === email);
}
