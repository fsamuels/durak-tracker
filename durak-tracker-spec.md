# Durak Tracker — Project Spec (v0.3)

## Overview

Mobile-first PWA for tracking results of Durak card games played among groups of friends. Tracks who was "the durak" (loser) each game, trump suit, players involved, and various computed statistics at the group and player level.

## Goals (v1)

- Log games: start time, optional end time, group, trump suit, deck count, players, durak, first out, last out
- Support multiple groups (isolated data per group)
- Support guest players (no account required), claimable later
- Computed stats per group, per player within a group, and per player across all groups
- Single-user entry per game (no multi-confirmation in v1)
- Installable as PWA on mobile, no app store distribution yet

## Non-Goals (v1)

- Durak rule variants (perevodnoy, etc.) — not modeled
- Offline play/sync — online only
- Multi-player confirmation/entry for a single game
- Push notifications
- Edit or delete game (see Roadmap)
- Group invitations (see Roadmap)
- Guest player claiming (see Roadmap)

---

## Tech Stack

| Layer              | Choice                                  | Notes                                      |
| ------------------ | --------------------------------------- | ------------------------------------------ |
| Frontend           | Next.js (App Router) + TypeScript       | Mobile-first, PWA via `next-pwa`           |
| Styling            | Tailwind CSS                            | Fast iteration, mobile-first utilities     |
| Backend/DB         | Supabase (Postgres)                     | Free tier; built-in auth, RLS              |
| Auth               | Supabase Auth — Google + Facebook OAuth |                                            |
| Hosting            | Vercel                                  | Free tier, GitHub auto-deploy              |
| Package manager    | pnpm                                    | Faster installs, disk-efficient            |
| Testing            | Vitest (unit) + Playwright (e2e, later) | Start with Vitest only in v1               |
| Linting/formatting | ESLint + Prettier                       | Default Next.js config + Prettier          |
| Validation         | Zod                                     | Schema validation for forms and API inputs |
| Forms              | React Hook Form + Zod                   | Standard pairing                           |

---

## Data Model

### DB-level types

```sql
CREATE TYPE trump_suit AS ENUM ('hearts', 'diamonds', 'clubs', 'spades');
```

### `groups`

| Column     | Type                  | Notes                                                                                                                              |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| id         | uuid, PK              |                                                                                                                                    |
| name       | text                  | e.g. "Run Club", "Dev Test"                                                                                                        |
| timezone   | text                  | IANA tz (e.g. `America/New_York`); default = group creator's browser tz. Reference tz for time-span stat buckets (week/month/year) |
| created_by | uuid, FK → auth.users |                                                                                                                                    |
| created_at | timestamptz           |                                                                                                                                    |
| updated_at | timestamptz           | auto-updated via trigger                                                                                                           |

### `group_members`

| Column    | Type                  | Notes               |
| --------- | --------------------- | ------------------- |
| group_id  | uuid, FK → groups     |                     |
| user_id   | uuid, FK → auth.users |                     |
| role      | text                  | 'owner' \| 'member' |
| joined_at | timestamptz           |                     |

> Composite PK `(group_id, user_id)` — a user appears at most once per group.

### `players`

Represents anyone who can appear in a game — registered or guest.

| Column       | Type                            | Notes                                       |
| ------------ | ------------------------------- | ------------------------------------------- |
| id           | uuid, PK                        |                                             |
| group_id     | uuid, FK → groups               | players are scoped to a group               |
| display_name | text                            |                                             |
| auth_user_id | uuid, nullable, FK → auth.users | null = guest; set when guest claims account |
| created_at   | timestamptz                     |                                             |
| updated_at   | timestamptz                     | auto-updated via trigger                    |

> `is_guest` removed — fully derivable as `auth_user_id IS NULL`. Use this expression in queries and views rather than storing a redundant boolean.
>
> No DB uniqueness constraint on `display_name` within a group in v1 (real groups can have two "Sasha"s). The type-ahead in the log-a-game form should warn when a typed name closely matches an existing player to avoid accidental duplicates. Merging duplicate guests is a future concern, adjacent to the claiming flow.

### `games`

| Column     | Type                      | Notes                                                   |
| ---------- | ------------------------- | ------------------------------------------------------- |
| id         | uuid, PK                  |                                                         |
| group_id   | uuid, FK → groups         |                                                         |
| started_at | timestamptz               | when the game started; may be backdated                 |
| ended_at   | timestamptz, nullable     | when the game ended; duration = `ended_at - started_at` |
| trump_suit | trump_suit enum, nullable |                                                         |
| deck_count | int, nullable             | number of decks used                                    |
| logged_by  | uuid, FK → auth.users     | who entered the result                                  |
| notes      | text, nullable            |                                                         |
| metrics    | jsonb, nullable           | flexible extra metrics (see below)                      |
| created_at | timestamptz               |                                                         |
| updated_at | timestamptz               | auto-updated via trigger                                |

> **Required vs optional at log time:** the only mandatory game data is **exactly one durak** (see `game_players`). `trump_suit`, `deck_count`, `ended_at`, `notes`, and `metrics` are all optional. `started_at` defaults to now and is editable (backdatable). Stats that consume optional fields (trump frequency, average duration) must exclude null rows and may report coverage (e.g. "based on 12 of 18 games").

### `game_players`

One row per player per game.

| Column       | Type               | Notes                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| game_id      | uuid, FK → games   |                                                                    |
| player_id    | uuid, FK → players |                                                                    |
| is_durak     | bool               | true if this player was the durak                                  |
| is_first_out | bool               | true if this player finished first (best outcome)                  |
| is_last_out  | bool               | true if this player finished second-to-last (one before the durak) |

**Constraints:**

- `UNIQUE (game_id)` partial index where `is_durak = true` — at most one durak per game
- `UNIQUE (game_id)` partial index where `is_first_out = true` — at most one first-out per game
- `UNIQUE (game_id)` partial index where `is_last_out = true` — at most one last-out per game
- A player cannot hold more than one of `is_durak`, `is_first_out`, `is_last_out` simultaneously (check constraint)

> **Partial unique indexes enforce _at most one_, not _exactly one_.** Durak is mandatory: every game must have exactly one durak. Enforce this with (a) a deferred-constraint trigger that fires on game completion (after all `game_players` rows for the game are inserted) rejecting any game with a durak count ≠ 1, **and** (b) Zod/app-layer validation at log time. `is_first_out` and `is_last_out` stay optional ("at most one" is correct for them).

> **Minimum 3 players per game.** Validated in Zod and the app layer (a game with fewer than 3 `game_players` is rejected). With ≥3 players, `is_durak`, `is_first_out`, and `is_last_out` always refer to three distinct players, so the check constraint above is always satisfiable. (Heads-up / 2-player Durak is out of scope for v1 because first-out and second-to-last collapse to the same player.) No hard maximum is imposed; note that one 36-card deck typically tops out around 6 players, and additional decks allow more.

---

## Metrics

All metrics are computed (derived from stored data, not cached/stored separately unless performance requires it later).

> **Time-span buckets** ("this week / month / year") are computed over `games.started_at` (a `timestamptz`) **in the owning group's `timezone`**. Bucketing per group keeps weekly/monthly results (e.g. "Most Durak this week") deterministic regardless of the viewer's location.
>
> **Null handling:** metrics derived from optional fields exclude rows where the field is null — trump-suit frequency ignores games with no trump; average duration considers only games with both `started_at` and `ended_at`.

### Per-player, per-group

- **Durak count**: total times the durak, all-time and per time span (week/month/year)
- **Durak rate**: durak count / games played
- **First out count & rate**: times finished first / games played
- **Last out count & rate**: times finished second-to-last / games played
- **Game count**: total games played in the group
- **Current durak streak**: consecutive games where this player was the durak
- **Current win streak**: consecutive games where this player was first out
- **Longest durak streak** (all-time): longest consecutive durak run
- **Longest win streak** (all-time): longest consecutive first-out run

> **Streak definition:** all streaks are computed over the **player's participated games only**, ordered by `started_at`. Games the player did not appear in are skipped entirely — they neither extend nor break a streak. A streak resets only on a participated game where the relevant condition (durak / first-out) is false.

### Per-player, cross-group (account level)

All of the above aggregated across every group the player belongs to, useful for players in multiple groups.

> **Cross-group aggregation works only for registered players.** Because `players` are group-scoped, the same human is a separate `players` row per group, joined across groups solely by `auth_user_id`. Guests (`auth_user_id IS NULL`) cannot be aggregated across groups until they claim their account (see Roadmap). Cross-group stats therefore cover only the authenticated user's own linked player rows.

### Per-group

- **Most Durak**: player with highest durak count, all-time and per time span
- **Last Durak**: durak from the most recent game
- **Player game count min/max/avg**: distribution of games-played counts across all players in the group — shows who shows up most/least
- **Trump suit frequency**: count and % per suit across all group games
- **Average game duration**: mean of `ended_at - started_at` for games where both are present
- **Head-to-head**: when any two players both appear in a game, what % of those shared games did each become durak — surfaced on the player stats screen

### Per-game (stored in `games.metrics` jsonb — optional at log time)

- `round_count`: number of rounds/hands played

> jsonb allows adding new per-game metrics without schema migrations. Promote to a real column once a field proves stable and is queried frequently.

---

## Auth & Permissions

- Supabase Auth: Google + Facebook OAuth providers
- On first login: user is routed to onboarding and prompted to create a new group or (future) accept an invitation. A `players` row requires a `group_id`, so it does **not** exist at login — it is created when the user **creates or joins a group**, and linked to their `auth_user_id` at that moment (one `players` row per group they belong to).
- If a user has no group membership, all app screens redirect to onboarding until resolved
- Row Level Security (RLS):
  - Users can only read/write data for groups they belong to (enforced via `group_members`)
  - `players`, `games`, `game_players` all scoped via `group_id` → `group_members` check
  - Cross-group player stats are assembled from all groups the authenticated user belongs to

## Guest Players & Claiming

- Guest players: `players` row with `auth_user_id = null`, added inline during game logging by typing a name
- v1: no claiming UI; schema supports it from day one
- Future claiming flow: authenticated user identifies their guest `players` row within a group → sets `auth_user_id` → all historical game_players rows carry forward automatically (no data migration needed)

---

## Pages/Screens (v1)

1. **Login** — Google/Facebook OAuth buttons
2. **Onboarding** — shown after first login if user has no group; options: create group (v1) or accept invitation (future)
3. **Log a game** — form: start time (default now, editable/backdatable), optional end time, trump suit, deck count, player list (type-ahead from group players + inline "add guest"; **minimum 3 players**), select durak (**required**), optionally mark first out and last out, optional notes. Submit is blocked until ≥3 players are present and exactly one durak is selected.
4. **Game history** — list of past games for active group, filterable by date range
5. **Group stats** — most/last durak, trump suit frequency, player game counts, avg duration, streaks
6. **Player stats** — individual rates, streaks, head-to-head, cross-group aggregates

---

## Roadmap (Post-v1)

- **Edit/delete game**: scoped to the `logged_by` user or group owner; soft delete preferred to preserve data integrity; audit trail of changes
- **Group invitations**: owner generates an invite link or code; invitee clicks link → authenticates → joins group; invite expires after N days or N uses
- **Guest player claiming**: UI for an authenticated user to claim a guest player record within their group
- **Offline support**: service worker queues game writes locally, syncs on reconnect
- **Multi-player game confirmation**: multiple players confirm or enter results for the same game; conflict resolution TBD
- **Push notifications**: streak alerts, durak taunts, etc.
- **Native app**: Capacitor wrapper around the PWA for app store distribution

---

## Open Questions / Decisions for Later

- Group switching UI — dropdown vs separate URLs (`/groups/[id]/...`)
- ~~Should `started_at` default to now and be editable?~~ **Decided (v0.3):** defaults to now, editable/backdatable.
- Should `ended_at` be enterable at log time only, or support a "start timer / stop timer" flow for real-time tracking in a future release?
- Head-to-head: surface on player profile page only, or also on a dedicated comparison screen?

---

## Milestones

1. **Project scaffold & deploy**: initialize Next.js + TS + Tailwind + pnpm repo, connect to GitHub, deploy "Hello Durak Tracker" to Vercel — no auth, no DB yet. Confirm CI/CD pipeline works end to end.
2. **Schema**: create Supabase project, define all tables, enum types, constraints, partial indexes, RLS policies, and `updated_at` triggers. Validate with seed data.
3. **Auth**: configure Google + Facebook OAuth in Supabase, implement login/logout flow, onboarding screen (create group), protect all routes — redirect to login if unauthenticated, redirect to onboarding if no group.
4. **Core flow**: add players (incl. guests), log a game, persist to DB
5. **Game history**: list games per group, date range filter
6. **Stats v1**: group stats page, player stats page, all computed metrics above
7. **PWA polish**: manifest, icons, install prompt, offline static asset caching
8. **Iterate**: additional metrics, claiming flow, invite system, refinements from real usage

---

## Changelog

### v0.3

- **Minimum 3 players per game** — rules out heads-up play where first-out and last-out collapse to one player; validated in app + Zod.
- **Exactly one durak required**, enforced via a deferred-constraint trigger (partial unique index only guarantees _at most one_) plus app-layer validation. `trump_suit`, `deck_count`, `ended_at`, first/last out remain optional.
- **Streaks** defined over the player's _participated games only_ — sitting out neither extends nor breaks a streak.
- **Edit/delete stays a non-goal in v1** (roadmap only).
- Added `groups.timezone` as the reference timezone for time-span stat buckets.
- Documented null handling for trump/duration stats.
- Clarified that **cross-group aggregation works only for registered players** (guests join across groups only after claiming).
- Fixed the onboarding contradiction: a `players` row is created at group create/join, not at first login.
- Minor: `group_members` composite PK `(group_id, user_id)`; no guest display-name uniqueness in v1 (warn on near-duplicates); `started_at` decided to default-now/backdatable.
