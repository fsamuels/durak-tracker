import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Service-role Supabase client for privileged, server-only admin operations
 * (e.g. the Auth Admin API, which is unavailable to the anon key).
 *
 * SECURITY: the service-role key bypasses Row Level Security entirely. This
 * client must NEVER be created in browser/client code or handed to it. Always
 * gate its use behind an `isAdmin` check at the call site.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for admin operations.",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
