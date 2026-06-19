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

| Layer           | Choice                                                                                           | Status       |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------ |
| Frontend        | Next.js (App Router) + TypeScript                                                                | In use       |
| Styling         | Tailwind CSS v4 + aurora theme tokens (`globals.css`)                                            | In use       |
| Database / Auth | Supabase (Postgres 17), RLS                                                                      | In use       |
| Hosting / CI    | Vercel + GitHub auto-deploy                                                                      | In use       |
| Package manager | pnpm                                                                                             | In use       |
| Lint / format   | ESLint (flat config) + Prettier                                                                  | In use       |
| Auth providers  | Supabase Auth — Google (Facebook deferred)                                                       | In use       |
| PWA             | Web App Manifest + **hand-written service worker** (`next-pwa` dropped — Turbopack-incompatible) | In use (M11) |
| Validation      | Zod                                                                                              | In use       |
| Forms           | React Hook Form + Zod                                                                            | In use       |
| Testing (unit)  | Vitest + React Testing Library; CI via GitHub Actions                                            | In use       |
| Testing (e2e)   | Playwright                                                                                       | Planned      |

> Only the "In use" rows are installed today. "Planned" rows are introduced in the
> milestone noted; see [roadmap.md](./roadmap.md).

## Data model (as built)

Defined in [`supabase/migrations/20260616015925_init_schema.sql`](../supabase/migrations/20260616015925_init_schema.sql).

Enums: `trump_suit = ('hearts','diamonds','clubs','spades')`;
`game_status = ('in_progress','completed')`.

| Table           | Purpose                         | Key columns / notes                                                                                                                                                                                                  |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groups`        | A circle of players             | `name` (non-empty), `timezone` (IANA, default `UTC`), `created_by` → `auth.users`                                                                                                                                    |
| `group_members` | Who belongs to a group          | PK `(group_id, user_id)`; `role ∈ {owner, member}`                                                                                                                                                                   |
| `players`       | Anyone who can appear in a game | `group_id`-scoped; `auth_user_id` null ⇒ guest                                                                                                                                                                       |
| `games`         | One played game                 | `status` (`in_progress`\|`completed`, default `in_progress`); `started_at` (stamped at start), optional `ended_at` (stamped at finish)/`trump_suit`/`deck_count`/`notes`/`metrics` jsonb; `logged_by` → `auth.users` |
| `game_players`  | One row per player per game     | PK `(game_id, player_id)`; `is_durak`/`is_first_out`/`is_last_out`                                                                                                                                                   |

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
game is in place. App-layer Zod validation enforces the same rules earlier for UX,
and the start/finish RPCs (M8; `log_game` before that) keep a game and its players
in one transaction so the deferred checks fire with every row present (see below).

**Status-aware since M8.** With two-part logging, `check_game_player_integrity`
branches on `games.status`: an **in-progress** game needs only **≥1 player** (its
start roster), while the full **≥3 players / exactly-one-durak** invariants apply
only to **completed** games. Because the games-level trigger fires on the status
update, finishing a game re-runs the full check at COMMIT with every player row
present.

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
  membership and group settings; a game's `logged_by` must equal `auth.uid()` on
  insert. Games were insert-only in v1; **M8 (two-part logging) adds member
  `update` on `games` and member `update`/`delete` on `game_players`** so a game can
  be finished (status flip + roster/outcome reconciliation). This is scoped via the
  same `is_group_member` / `is_member_of_game` helpers; general-purpose edit/delete
  of a completed game remains a deferred roadmap item, and the app only mutates
  through the `start_game` / `finish_game` RPCs.

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

### Logging a game — `log_game(group_id, participants, started_at, …)`

Defined in [`supabase/migrations/20260616060126_log_game.sql`](../supabase/migrations/20260616060126_log_game.sql).
A game and all of its `game_players` must be inserted **in one transaction** so the
deferred integrity triggers (≥3 players, exactly one durak) validate at COMMIT with
every row present. Over PostgREST, two separate `.insert()` calls are two
transactions — the first would commit a player-less game and be rejected — so logging
goes through this RPC, taking the participants as a JSON array. Unlike `create_group`,
it is **`SECURITY INVOKER`**: it runs as the caller so RLS still gates every insert,
and `logged_by` is set from `auth.uid()` inside the function rather than trusted from
the client. The client (M4) builds forms with React Hook Form + Zod and re-validates
the same invariants in the server action before calling the RPC.

### Two-part logging — `start_game` / `finish_game` (M8)

Defined in [`supabase/migrations/20260616140000_two_part_logging.sql`](../supabase/migrations/20260616140000_two_part_logging.sql).
M8 **replaces** the one-shot `log_game` UI with a two-step flow (`log_game` itself
is left in the DB but unused):

- **`start_game(group_id, participants, trump?, deck?, notes?)`** inserts a game
  with `status = 'in_progress'`, stamps `started_at`, and inserts the starting
  roster (≥1 player, no outcomes yet).
- **`finish_game(game_id, participants, trump?, deck?, notes?)`** is the
  authoritative finish: it stamps `ended_at`, flips status to `completed`, and
  reconciles `game_players` for the final roster — upserts outcomes onto existing
  rows, inserts latecomers, and deletes anyone no longer present — then the deferred
  trigger validates the completed-game invariants at COMMIT.

Both are **`SECURITY INVOKER`** with `logged_by = auth.uid()`, mirroring `log_game`,
and each does its multi-row work in a single transaction so the deferred checks see
every row. There is **no time field in the UI** — `started_at` and `ended_at` are
stamped server-side; editing them is deferred to a future edit-game screen. A
standalone "add players to an in-progress game" RPC was folded into `finish_game`'s
reconciliation and deferred as a separate entry point.

### Roster ranking — `group_roster(group_id)` (M9)

Defined in [`supabase/migrations/20260616160000_group_roster.sql`](../supabase/migrations/20260616160000_group_roster.sql).
The start/finish player pickers (M8) list the group's roster; with a dozen+ players
they rank by **completed games played** (desc, then name) so frequent players surface
first. `group_roster` is a **`SECURITY INVOKER`** SQL function (like `group_stats` /
`most_played_group`) returning `(id, display_name, games_played)`; a LEFT JOIN keeps
guests and never-played members in the list with `games_played = 0`. Name search over
this list is **client-side** filtering once the ranked roster is loaded — no extra round
trip — and selected players stay visible while filtering. "Start again" pre-fills the
start form from a prior game's roster (`/games/new?from=<id>`); on-the-fly guest add in
both flows reuses `addPlayerAction`.

### Discard a game — `discard_game(game_id)` (M11)

Defined in [`supabase/migrations/20260617120000_discard_game.sql`](../supabase/migrations/20260617120000_discard_game.sql).
A started-but-unfinished game can be abandoned from the finish page. `discard_game`
is **`SECURITY INVOKER`** and deletes the game row (its `game_players` cascade via the
FK). RLS still gates the delete through a new **`games_delete`** policy scoped to
group members **and `status = 'in_progress'`** — so only in-progress games are
discardable; deleting a **completed** game remains a deferred edit/delete roadmap
item. The status guard is enforced both in the policy and in the function body.

## PWA & app shell (M11)

The app is installable and loads its static shell offline:

- **Manifest** via `app/manifest.ts` (standalone, dark theme, portrait). **Icons**
  are generated at build with `next/og` `ImageResponse` — `app/icon.tsx`,
  `app/apple-icon.tsx`, and `app/icons/[size]/route.tsx` (192 / 512 / maskable) — all
  rendering the **🃏 joker** brand mark through **Twemoji** (the default OG font has no
  color emoji). This adds a build-time fetch from the Twemoji CDN.
- **Service worker** is **hand-written** (`public/sw.js`, registered by
  `src/components/service-worker.tsx`): cache-first for Next static assets / icons so
  the shell loads offline; old cache versions are pruned on `activate`. `next-pwa` was
  evaluated and rejected — it injects a webpack config, but Next 16 defaults to
  Turbopack and errors on it.
- **Install prompt** (`src/components/install-prompt.tsx`) uses `useSyncExternalStore`
  to subscribe to the `beforeinstallprompt` event (Chrome/Edge only). A tiny inline
  script in `layout.tsx` captures the event before React hydrates to avoid a race
  condition. On iOS Safari (where `beforeinstallprompt` never fires), a fallback banner
  shows manual Share → Add to Home Screen instructions; dismissal is persisted in
  `localStorage`.
- **Layout shell:** a sticky header (`NavMenu`) + fixed bottom tab bar (`BottomNav`)
  render for signed-in users in the root layout. `viewport-fit=cover` plus
  `env(safe-area-inset-*)` padding keep content clear of the notch in the installed
  PWA (the status bar is `black-translucent`). Brand surfaces are unified on the
  `.app-bg` gradient (now on `<body>`) and the frosted `.card-surface` token.

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
- **Typed client** → after a schema change, regenerate the committed types with
  `supabase gen types typescript --linked > src/lib/supabase/database.types.ts` so
  `supabase.from(...)`/`.rpc(...)` stay type-safe.

## Key decisions (summary)

- **Direct client→Supabase + RLS** instead of a custom API tier — less code, auth
  enforced in one place.
- **Group-scoped `players`** (not global) — simpler per-group data; cross-group
  identity is reconstructed via `auth_user_id`.
- **SECURITY DEFINER helpers** to avoid recursive RLS evaluation.
- **Deferred constraint triggers** for multi-row invariants (one durak, ≥3 players).
- **`create_group` / `log_game` RPCs** for multi-row atomic writes — break the
  onboarding RLS chicken-and-egg, and keep a game + its players in one transaction.
- **`groups.timezone`** for deterministic time-bucketed stats.
- **Computed-not-stored metrics** until proven to need caching.
