# Admin area

The `/admin` route is an operator-only area for **account-authority** tooling —
system-wide views and actions that sit above any single group's RLS scope. It is
the first part of the app that uses the Supabase **service-role** key.

## Authorization model

Admin access is decided by a single helper, [`isAdmin`](../src/lib/admin.ts):

- Today it checks the signed-in user's email against a hard-coded allowlist
  (`ADMIN_EMAILS`, currently just `fsamuels@gmail.com`). The comparison is
  case-insensitive.
- **Planned:** promote this into a real "account authority" concept stored in the
  database (e.g. an `is_admin` flag on the user, or an `account_authorities`
  table). `isAdmin` is intentionally the only place that resolves admin status, so
  that swap won't touch any call site.

Access is enforced in **two layers**:

1. The shared middleware already redirects unauthenticated requests to `/login`,
   so every `/admin` request has a real session.
2. [`/admin/page.tsx`](../src/app/admin/page.tsx) calls `isAdmin(user)` and returns
   `notFound()` (a 404, not a redirect) for non-admins — the area's existence is
   never advertised to ordinary users.

The **menu entry** in [`NavMenu`](../src/components/nav-menu.tsx) is likewise gated:
the root layout computes `isAdmin(user)` server-side and passes it as a prop, so the
"Admin" link only renders for admins. This is UX only — the page check above is the
real gate.

## Service-role access

Listing every account in the system crosses RLS boundaries, so it can't use the
anon key + user JWT path the rest of the app relies on. Instead:

- [`createAdminClient`](../src/lib/supabase/admin.ts) builds a Supabase client from
  `SUPABASE_SERVICE_ROLE_KEY`. **This key bypasses RLS entirely** and must never be
  created in client code or given the `NEXT_PUBLIC_` prefix (see the key-exposure
  model in [architecture.md](./architecture.md)).
- It is only ever constructed inside server-only data helpers, called after the
  `isAdmin` gate in the page. If the env var is missing the client throws on
  construction rather than silently degrading.

## Feature: external authenticated accounts

The first admin feature lists **every external (OAuth) authenticated account in the
system**, newest sign-in first.

- Data comes from a **`SECURITY DEFINER` database function**
  `public.admin_list_external_accounts()` (migration
  `20260620000001_admin_list_users.sql`), called via `supabase.rpc()` from
  [`listExternalAccounts`](../src/lib/data/accounts.ts). It joins `auth.users` +
  `auth.identities` directly, filtering to the supported OAuth providers and ordering
  by `last_sign_in_at DESC`.
  - **Why not the Auth Admin API?** `supabase.auth.admin.listUsers` returns HTTP 500
    `unexpected_failure` ("Database error finding users") on this Supabase project
    configuration — GoTrue fails its own internal SQL query. The `SECURITY DEFINER`
    function bypasses GoTrue entirely while keeping the same auth.users data.
  - The function is granted to `service_role` only (`REVOKE ALL … FROM PUBLIC`), so
    it can't be reached through the anon key + RLS path.
- "External" means the OAuth providers the app supports — **Google, Facebook, and
  Discord**. The implicit `email` identity is excluded.
- Each row shows the provider, the name/email reported by that provider, the auth
  user's primary email, the linked / last-sign-in timestamps, and the account's
  **profile picture** (from the provider's `identity_data`, via the shared
  `pickAvatarUrl` extractor; falls back to initials when none is present).

## Feature: claim links

Below the accounts list, the admin page shows **every account claim link in the
system**, newest first, so an operator can see onboarding state across all groups
(who has an outstanding link, what's expired, what's been redeemed).

- Data comes from a **`SECURITY DEFINER` database function**
  `public.admin_list_player_claims()` (migration
  `20260629000001_admin_list_player_claims.sql`), called via `supabase.rpc()` from
  [`listAllPlayerClaims`](../src/lib/data/claims.ts). The `player_claims` RLS only
  lets a group member see their own group's links, so — like the accounts list — it
  must cross RLS via the service role. The function joins `players`, `groups`, and
  `auth.users` (twice: minter + claimer) and is granted to `service_role` only.
- **Status** is derived in the data helper with the same precedence as the
  `claim_details` RPC: a redeemed (or otherwise already-linked) player reads as
  **Claimed** even past expiry, otherwise **Expired** if past `expires_at`, else
  **Outstanding**. The section header shows per-status counts.
- Each row shows the player name, group, who minted it + when, and either the
  expiry (relative, e.g. "Expires in 3 days") or — for claimed links — who redeemed
  it and when.
- **The token is never returned by the RPC or rendered.** An outstanding link is a
  live single-use credential; the admin view only needs status, not the secret.

### Extending the admin area

Future account-authority features (e.g. promoting a user to admin, deactivating an
account, cross-group account aggregates) should follow the same shape: a server-only
data helper using `createAdminClient`, called from a page that gates on `isAdmin`
first. When the DB-backed authority model lands, only `isAdmin` and `ADMIN_EMAILS`
change.
