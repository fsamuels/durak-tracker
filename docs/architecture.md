# Architecture

How Durak Tracker is built. For _what_ it does and _why_ (product intent), see
[`durak-tracker-spec.md`](../durak-tracker-spec.md). For current progress, see
[current-status.md](./current-status.md).

## System overview

A mobile-first PWA: a **Next.js (App Router)** frontend talking directly to
**Supabase (Postgres)** for data and auth, hosted on **Vercel** with GitHub
auto-deploy. Authorization lives in the database via **Row Level Security (RLS)**,
so the client can query Supabase directly without a bespoke API layer.

```
Browser (Next.js / React / Tailwind)
   │  Supabase JS client (anon key, user JWT)
   ▼
Supabase Postgres ── RLS policies scope every row to the user's groups
   │
   └─ SECURITY DEFINER helpers + create_group RPC + integrity triggers
```

## Tech stack

| Layer           | Choice                            | Status          |
| --------------- | --------------------------------- | --------------- |
| Frontend        | Next.js (App Router) + TypeScript | In use          |
| Styling         | Tailwind CSS v4                   | In use          |
| Database / Auth | Supabase (Postgres 17), RLS       | In use          |
| Hosting / CI    | Vercel + GitHub auto-deploy       | In use          |
| Package manager | pnpm                              | In use          |
| Lint / format   | ESLint (flat config) + Prettier   | In use          |
| Auth providers  | Supabase Auth — Google + Facebook | Planned (M3)    |
| PWA             | `next-pwa` (manifest, SW)         | Planned (M7)    |
| Validation      | Zod                               | Planned (M3/M4) |
| Forms           | React Hook Form + Zod             | Planned (M4)    |
| Testing         | Vitest (unit), Playwright (e2e)   | Planned         |

> Only the "In use" rows are installed today. "Planned" rows are introduced in the
> milestone noted; see [roadmap.md](./roadmap.md).

## Data model (as built)

Defined in [`supabase/migrations/20260616015925_init_schema.sql`](../supabase/migrations/20260616015925_init_schema.sql).

Enum: `trump_suit = ('hearts','diamonds','clubs','spades')`.

| Table           | Purpose                         | Key columns / notes                                                                                                           |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `groups`        | A circle of players             | `name` (non-empty), `timezone` (IANA, default `UTC`), `created_by` → `auth.users`                                             |
| `group_members` | Who belongs to a group          | PK `(group_id, user_id)`; `role ∈ {owner, member}`                                                                            |
| `players`       | Anyone who can appear in a game | `group_id`-scoped; `auth_user_id` null ⇒ guest                                                                                |
| `games`         | One played game                 | `started_at` (backdatable), optional `ended_at`/`trump_suit`/`deck_count`/`notes`/`metrics` jsonb; `logged_by` → `auth.users` |
| `game_players`  | One row per player per game     | PK `(game_id, player_id)`; `is_durak`/`is_first_out`/`is_last_out`                                                            |

**Referential integrity (`ON DELETE`):** `group_id`, `game_id`, and member
`user_id` **cascade**; `players.auth_user_id` **set null** (a deleted user's
player reverts to a guest, preserving history); `game_players.player_id` and
`games.logged_by` **restrict** (protect game history from accidental loss).

**CHECK constraints:** `deck_count > 0`; non-empty `name`/`display_name`;
`ended_at >= started_at`; and on `game_players`, at most one of the three outcome
flags per row (`is_durak::int + is_first_out::int + is_last_out::int <= 1`).

**Indexes:** FK lookup indexes on all child tables; `games (group_id, started_at desc)`
for history; three **partial unique indexes** enforcing _at most one_ durak /
first-out / last-out per game.

## Integrity enforcement: why triggers, not just CHECKs

Two invariants span multiple rows and can't be expressed as a row-level CHECK:

1. **Exactly one durak per game** (partial unique index only guarantees _at most one_).
2. **At least 3 players per game** (heads-up Durak is out of scope; with ≥3 players
   the three outcome roles are always distinct).

These are enforced by **`DEFERRABLE INITIALLY DEFERRED` constraint triggers**
(`game_players_integrity` on `game_players`, `games_integrity` on `games`) that
call `check_game_player_integrity(game_id)` at **COMMIT** — once every row for the
game is in place. The games-level trigger also catches a game inserted with zero
players. App-layer Zod validation will enforce the same rules earlier for UX.

`set_updated_at()` BEFORE-UPDATE triggers maintain `updated_at` on
`groups`, `players`, and `games`.

## Authorization (RLS)

RLS is enabled on all five tables; every policy targets the `authenticated` role
and scopes rows through `group_members`.

- **Helper functions** `is_group_member`, `is_group_owner`, `is_member_of_game`
  are **`SECURITY DEFINER`** with a pinned `search_path`. They run as the owner so
  that evaluating a policy on `group_members` does not recursively trigger
  `group_members`' own RLS. Membership checks are always against `auth.uid()`, so
  they can't be abused to probe other users.
- **Policy summary:** members can read their groups' rows; group **owners** manage
  membership and group settings; games/`game_players` are insert-only for members
  (no edit/delete in v1, matching the product non-goal); a game's `logged_by` must
  equal `auth.uid()` on insert.

### Client access & key-exposure model

The browser talks to Supabase's **PostgREST gateway**
(`https://<ref>.supabase.co`), never to Postgres directly — the database password
and connection are unreachable from the client.

**Two keys, two trust levels:**

| Key                             | Secret?                   | Runs                | Grants                                  |
| ------------------------------- | ------------------------- | ------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No — **public by design** | Browser + server    | The low-privilege `anon` role           |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Yes — server only**     | Server only         | Full DB access, **bypasses RLS**        |
| `SUPABASE_DB_PASSWORD`          | Yes                       | CLI/migrations only | Direct Postgres (never used by the app) |

The **`NEXT_PUBLIC_` prefix is the dividing line**: Next.js inlines those vars into
the client bundle (public), while unprefixed vars stay server-only. So the
service_role key must never get that prefix or be used in a Client Component.

```
Browser ──(anon key + user's JWT cookie)──▶ PostgREST gateway
                                                │ query runs as `authenticated`
                                                ▼ with auth.uid() = the user
                                        Postgres + RLS policies
```

The anon key is safe to ship because it is a low-privilege token; the actual access
control is **RLS + the user's session JWT**. This makes **RLS load-bearing** — a
table without RLS or a wrong policy is a public data leak — which is why RLS is
enabled on all five tables and the cross-group isolation is tested. In production,
all four values are Vercel environment variables; only the two `NEXT_PUBLIC_` ones
reach the browser.

### Why RLS — fit and trade-offs

RLS fits this app: a single Postgres as source of truth, a direct browser→Supabase
pattern (no custom API tier), group isolation cleanly expressible in SQL, and a
small team — authorization lives in exactly one place. Policies are arbitrary SQL
booleans (relationship-, role-, or attribute-based), not merely per-user; ours are
**relationship-based** ("are you a member of this row's group?" via `group_members`).

Trade-offs to keep in mind: policies run on every query, so complex ones cost
performance (mitigated by the `SECURITY DEFINER` helpers and indexes above); they
are harder to reason about and need explicit tests; they only protect Postgres (a
future search index, cache, or analytics store would need its own authorization);
and the service_role key bypasses them entirely. If authorization ever outgrows what
SQL expresses comfortably, the escalation path is an app-tier check or a dedicated
authz service (e.g. OPA, or a Zanzibar-style ReBAC system) layered on top.

### Onboarding RPC — `create_group(name, timezone, display_name)`

A `players`/membership row must exist for RLS to grant access, but a brand-new user
can't insert their own owner row under RLS before they're a member — a
chicken-and-egg. `create_group` is a **`SECURITY DEFINER`** function that atomically
creates the group, the caller's `owner` membership, and the caller's linked
`players` row, then returns the group. This is the single entry point for onboarding.

## Metrics

All metrics are **computed from stored data, not cached**, unless performance later
demands materialization. Metric _definitions_ live in the
[spec](../durak-tracker-spec.md#metrics); the computation rules are:

- **Time-span buckets** (week/month/year) are evaluated over `games.started_at` in
  the **owning group's `timezone`**, so "Most Durak this week" is deterministic
  regardless of viewer location.
- **Null handling:** metrics over optional fields exclude null rows (trump frequency
  ignores null `trump_suit`; average duration needs both `started_at` and `ended_at`).
- **Streaks** are computed over a player's **participated games only**, ordered by
  `started_at`; sitting out neither extends nor breaks a streak.
- **Cross-group** aggregation works only for **registered** players (joined across
  groups via `auth_user_id`); guests are group-local until claimed.

## Local dev & database workflow

This machine has **no Docker**, so the local Supabase stack / `db reset` is not used.

- **Schema migrations** → `supabase db push` (CLI linked to the remote project;
  auth token in the CLI keychain via `supabase login`). Migrations live in
  `supabase/migrations/`.
- **Seed / ad-hoc SQL** → there is no generic remote-SQL CLI command, so use `psql`
  (from `brew install libpq`) over the **IPv4 session pooler**:
  `aws-1-us-east-2.pooler.supabase.com:5432`, user `postgres.<project-ref>`, db
  `postgres`. Pass the password via `PGPASSWORD` from `.env.local` (avoids
  URL-encoding). The direct `db.<ref>.supabase.co` host is IPv6-only.
- `supabase/seed.sql` is wrapped in one `begin; … commit;` so the deferred integrity
  triggers validate at COMMIT, after each game has its players.

## Key decisions (summary)

- **Direct client→Supabase + RLS** instead of a custom API tier — less code, auth
  enforced in one place.
- **Group-scoped `players`** (not global) — simpler per-group data; cross-group
  identity is reconstructed via `auth_user_id`.
- **SECURITY DEFINER helpers** to avoid recursive RLS evaluation.
- **Deferred constraint triggers** for multi-row invariants (one durak, ≥3 players).
- **`create_group` RPC** to break the onboarding RLS chicken-and-egg.
- **`groups.timezone`** for deterministic time-bucketed stats.
- **Computed-not-stored metrics** until proven to need caching.
