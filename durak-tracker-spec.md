# Durak Tracker — Product Spec (v0.4)

> This is the **product** spec: what the app does and why. Implementation details
> have moved to [`docs/architecture.md`](docs/architecture.md). Progress lives in
> [`docs/current-status.md`](docs/current-status.md); upcoming work and the backlog
> in [`docs/roadmap.md`](docs/roadmap.md).

## Overview

Mobile-first PWA for tracking results of Durak card games played among groups of
friends. Tracks who was "the durak" (loser) each game, trump suit, players involved,
and various computed statistics at the group and player level.

## Goals (v1)

- Log games: start time, optional end time, group, trump suit, deck count, players,
  durak, first out, last out
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
- Edit or delete game (see [roadmap](docs/roadmap.md))
- Group invitations (see [roadmap](docs/roadmap.md))
- Guest player claiming (see [roadmap](docs/roadmap.md))

## Core rules

- **Minimum 3 players per game.** Heads-up (2-player) Durak is out of scope, because
  "first out" and "second-to-last out" would collapse to the same player.
- **Exactly one durak per game** is required. Trump suit, deck count, end time, first
  out, and last out are all optional.
- **First out** = finished first (best outcome); **last out** = finished
  second-to-last, i.e. one before the durak. A player holds at most one of
  durak / first-out / last-out.
- **Start time** defaults to now and is editable (backdatable).
- **Guests** are players without an account, added inline by typing a name; they
  belong to one group until they later claim an account.

> How these rules are enforced (DB constraints, triggers, RLS) is described in
> [architecture.md](docs/architecture.md).

## Pages / Screens (v1)

1. **Login** — Google/Facebook OAuth buttons.
2. **Onboarding** — shown after first login if the user has no group; create a group
   (v1) or accept an invitation (future).
3. **Log a game** — start time (default now, backdatable), optional end time, trump
   suit, deck count, player list (type-ahead from group players + inline "add guest";
   **min 3 players**), select durak (**required**), optionally mark first/last out,
   optional notes. Submit is blocked until ≥3 players and exactly one durak.
4. **Game history** — list of past games for the active group, filterable by date range.
5. **Group stats** — most/last durak, trump suit frequency, player game counts, avg
   duration, streaks.
6. **Player stats** — individual rates, streaks, head-to-head, cross-group aggregates.

## Metrics

All metrics are **computed** from stored data. Computation rules (group-timezone
bucketing, null handling, streak/cross-group semantics) are in
[architecture.md](docs/architecture.md#metrics).

### Per-player, per-group

- **Durak count** — times the durak (all-time and per week/month/year)
- **Durak rate** — durak count / games played
- **First out / last out count & rate**
- **Game count** — total games played in the group
- **Current / longest durak streak**; **current / longest win (first-out) streak**

### Per-player, cross-group (account level)

All of the above, aggregated across every group the player belongs to. Works only
for **registered** players (joined across groups via their account).

### Per-group

- **Most Durak** — highest durak count (all-time and per time span)
- **Last Durak** — durak from the most recent game
- **Player game count min/max/avg** — who shows up most/least
- **Trump suit frequency** — count and % per suit
- **Average game duration** — over games with both start and end times
- **Head-to-head** — for any two players sharing games, each one's durak %

### Per-game (optional, stored in `games.metrics`)

- `round_count` — number of rounds/hands played

## Guest Players & Claiming

- A guest is a `players` row with no linked account, added inline during game logging.
- v1 ships no claiming UI, but the schema supports it from day one.
- Future claiming: an authenticated user identifies their guest record within a group
  → links their account → all historical results carry forward automatically.

## Changelog

### v0.4

- Documentation reorganized: implementation details (tech stack, data model, RLS,
  milestones, roadmap) moved out of this spec into [`docs/`](docs/). This file is now
  the product spec only.

### v0.3

- **Minimum 3 players per game**; **exactly one durak required**; **streaks** over a
  player's participated games only; **edit/delete** stays a non-goal in v1.
- Added group-level timezone for time-span stat buckets; documented null handling for
  trump/duration stats; clarified cross-group aggregation is registered-players-only;
  fixed onboarding so a `players` row is created at group create/join, not first login.
