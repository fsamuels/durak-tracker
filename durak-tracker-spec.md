# Durak Tracker — Product Spec (v0.5)

> This is the **product** spec: what the app does and why. Implementation details
> have moved to [`docs/architecture.md`](docs/architecture.md). Progress lives in
> [`docs/current-status.md`](docs/current-status.md); upcoming work and the backlog
> in [`docs/roadmap.md`](docs/roadmap.md).

## Overview

Mobile-first PWA for tracking results of Durak card games played among groups of
friends. Tracks who was "the durak" (loser) each game, trump suit, players involved,
and various computed statistics at the group and player level.

## Goals (v1)

- Log games in two steps — start (roster, trump, deck) then finish (durak, first out,
  last out) — with start/end times recorded automatically and correctable afterwards
- Support multiple groups (isolated data per group)
- Support guest players (no account required), claimable later via a shared link
- Computed stats per group and per player within a group (per-player stats across all
  groups are specified below but not built yet)
- Single-user entry per game (no multi-confirmation in v1)
- Installable as PWA on mobile, no app store distribution yet

## Non-Goals (v1)

- Durak rule variants (perevodnoy, etc.) — not modeled
- Offline play/sync — online only
- Multi-player confirmation/entry for a single game
- Push notifications
- Group invitations beyond the guest-claim link (see [roadmap](docs/roadmap.md))

## Core rules

- **Minimum 3 players per game.** Heads-up (2-player) Durak is out of scope, because
  "first out" and "second-to-last out" would collapse to the same player.
- **Exactly one durak per game** is required. Trump suit, deck count, end time, first
  out, and last out are all optional.
- **First out** = finished first (best outcome); **last out** = finished
  second-to-last, i.e. one before the durak. A player holds at most one of
  durak / first-out / last-out.
- **Start and end time** are stamped when the game is started and finished (there are no
  time fields in those flows). The game's logger can correct either afterwards by
  editing the game, and can also delete it (soft delete; deleted games are excluded from
  history and stats).
- **Guests** are players without an account, added inline by typing a name; they
  belong to one group until they later claim an account.

> How these rules are enforced (DB constraints, triggers, RLS) is described in
> [architecture.md](docs/architecture.md).

## Pages / Screens (v1)

1. **Login** — Google/Facebook/Discord OAuth buttons (signed-out visitors first see a
   public landing page at `/`).
2. **Onboarding** — shown after first login if the user has no group; create a group,
   or redeem a guest-claim link to join one.
3. **Start a game** — pick the players (chip grid with search and inline "add guest"),
   optional trump suit, deck count and notes. Needs ≥1 player; "Play again" pre-selects
   a previous game's roster.
4. **Finish a game** — adjust the roster, set each player's outcome, select the durak
   (**required**) and optionally first/last out. Submit is blocked until ≥3 players and
   exactly one durak. An unfinished game can be discarded.
5. **Game history and detail** — completed games for the active group, filterable by
   date range, each with a detail page and (for the logger) edit / delete.
6. **Group stats** — most/last durak, trump suit frequency, player game counts, avg
   duration, streaks, charts, week/month/year/all-time windows.
7. **Player stats** — individual rates, streaks, recent form, head-to-head.
8. **Manage group / players / account** — switch groups, rename yourself, share claim
   links for guests, theme and sign-in methods. (An operator-only `/admin` area exists
   outside the product scope.)

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
- Claiming (shipped in M10): any group member generates a single-use link (valid 7 days)
  for a guest; the real person opens it, signs in, and their account is linked to that
  player and added to the group, so all historical results carry forward automatically.

## Changelog

### v0.5

- Brought the spec in line with what shipped: two-part start/finish logging, server-stamped
  times with later correction, edit/soft-delete of completed games, guest claiming,
  Facebook/Discord login, and the current screen list. Cross-group stats remain specified
  but unbuilt.

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
