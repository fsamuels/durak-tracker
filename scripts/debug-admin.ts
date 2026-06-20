/**
 * Standalone debug script for the admin user-listing path.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/debug-admin.ts
 *
 * Requires Node 20.6+ for --env-file support.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

console.log("Supabase URL:", url);
console.log(
  "Service role key:",
  serviceRoleKey.slice(0, 20) + "..." + serviceRoleKey.slice(-6),
);

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Test 1: GoTrue Auth Admin API (known to 500 on this project) ---
console.log("\n[1] auth.admin.listUsers({ perPage: 1000 }) ...");
{
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) {
    console.error("  ERROR:", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: (error as { code?: string }).code,
    });
  } else {
    console.log(`  OK — ${data.users.length} users`);
  }
}

// --- Test 2: GoTrue with no params (uses GoTrue defaults) ---
console.log("\n[2] auth.admin.listUsers() — no params ...");
{
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("  ERROR:", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: (error as { code?: string }).code,
    });
  } else {
    console.log(`  OK — ${data.users.length} users`);
  }
}

// --- Test 3: Direct DB query via SECURITY DEFINER RPC (the new approach) ---
console.log("\n[3] rpc('admin_list_external_accounts') ...");
{
  const { data, error } = await supabase.rpc("admin_list_external_accounts");
  if (error) {
    console.error("  ERROR:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  } else {
    const rows = data as { provider: string }[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.provider] = (counts[r.provider] ?? 0) + 1;
    console.log(`  OK — ${rows.length} identities`, counts);
  }
}
