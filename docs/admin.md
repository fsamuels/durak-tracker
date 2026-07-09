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

## Feature: system overview

The top of the admin page shows a **system-wide overview** — at-a-glance totals
plus a few derived insights that sit above any single group's RLS scope.

- Data comes from a **`SECURITY DEFINER` database function**
  `public.admin_system_stats()` (migration `20260701000000_admin_system_stats.sql`),
  called via `supabase.rpc()` from [`getSystemStats`](../src/lib/data/system.ts). Like
  the accounts/claims lists, the counts span every group + `auth.users`, so they must
  cross RLS via the service role; the function is granted to `service_role` only.
- It returns **exactly one row** of scalar counts — the outer `SELECT` has no `FROM`,
  so it yields one row even on an empty system (the top-group scalar subqueries read
  `NULL`/`0` then). Counts include: groups, registered users, players (+ guests),
  games (completed + in-progress), games in the last 7/30 days (by `started_at`), new
  users in the last 7 days, active groups in the last 7 days, and the most active
  group (most completed games) with its game count.
- Rendered by the presentational [`SystemStats`](../src/app/admin/system-stats.tsx)
  component: a grid of number tiles plus an insights card. It's always expanded — it's
  the page's summary.

## UI: collapsible, filterable sections

The accounts and claim-link lists can grow long, so each is a **collapsible section**
([`CollapsibleSection`](../src/app/admin/collapsible-section.tsx)): the header (title +
count + chevron) is the toggle and stays visible, as does the section description; only
the list body collapses. Both start **collapsed** so the page opens as an at-a-glance
overview. A section that failed to load starts **expanded** so its error is visible.

The claim-links section ([`ClaimsSection`](../src/app/admin/claims-section.tsx)) also
offers **status filter chips** (All / Outstanding / Expired / Claimed, each with its
count) that filter the rendered list client-side; the chips double as the per-status
summary.

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
  - The function is granted to `service_role` only, so it can't be reached through
    the anon key + RLS path. **Note:** this takes two revokes — Supabase's default
    privileges grant `EXECUTE` on new functions to `anon`/`authenticated` directly,
    so `REVOKE … FROM PUBLIC` alone is not enough
    (`20260709000001_admin_fn_service_role_only.sql` fixed this across all admin
    functions).
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

## Feature: add account to group

Each row in the accounts list has an **"Add to group…"** action: an inline form that
puts that account into any group in the system — the operator-side answer to "add
this existing user to another group" without exposing a member-facing user search
(which would let any group enumerate system-wide accounts).

- The form picks a **group** (groups the account already has a player in are
  disabled), then either **links one of that group's guest players** to the account
  or **creates a new player** with a chosen display name (prefilled from the
  provider name). Options come from
  [`listAdminGroupOptions`](../src/lib/data/admin-groups.ts) (service role — it spans
  all groups).
- Submission goes through the [`addUserToGroupAction`](../src/app/admin/actions.ts)
  server action, which **re-checks `isAdmin`** (server actions are public HTTP
  endpoints — the page-level gate alone is not enough), validates with
  [`addUserToGroupSchema`](../src/lib/validation/admin.ts), and calls the
  **`admin_add_user_to_group`** RPC via `createAdminClient`.
- The RPC (`20260709000000_admin_add_user_to_group.sql`, `SECURITY DEFINER`, granted
  to `service_role` only) writes the same atomic pair the claim flow does —
  `group_members` + a linked `players` row — with `claim_player`'s guest/duplicate
  checks. See [architecture.md](./architecture.md) for the full contract.
- Unlike claim links this is **not consent-based**: the account is added without the
  user acting. That's the point of it being operator-only; user-initiated joining
  remains the claim-link flow.

### Extending the admin area

Future account-authority features (e.g. promoting a user to admin, deactivating an
account, cross-group account aggregates) should follow the same shape: a server-only
data helper using `createAdminClient`, called from a page that gates on `isAdmin`
first. When the DB-backed authority model lands, only `isAdmin` and `ADMIN_EMAILS`
change.
