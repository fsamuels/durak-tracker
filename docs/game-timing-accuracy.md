# Game timing accuracy — problem analysis and options

> **Status: discussion only. Nothing here is decided or implemented.** This
> document captures a design conversation about unreliable game durations so the
> reasoning isn't lost. No code, schema, or copy has changed. See
> [roadmap.md](./roadmap.md#open-questions--decisions-for-later).

## The problem

The two-part logging flow (M8) assumes players tap **Start** when the game
starts and **Finish** when it ends. In real usage they often don't — a game gets
started in the app near the _end_ of the actual game, so the recorded duration is
far shorter than the game really was. Observed real-data examples include a
**1-minute** game (physically impossible) and an **8-minute** game (known to be
wrong from memory, but not obviously wrong from the data).

The consequence is that per-game duration and the group's average duration are
both understated, and there's currently no mechanism — automatic or manual — that
detects, flags, or excludes a game with bad timing.

## How timing works today

- `start_game` stamps `started_at = now()`; `finish_game` stamps
  `ended_at = now()`. There are no time fields in either flow — see
  [`supabase/migrations/20260616140000_two_part_logging.sql`](../supabase/migrations/20260616140000_two_part_logging.sql).
- Duration is computed as a raw `ended_at - started_at` in three independent
  places:
  - `group_stats` — `avg_duration_seconds`, `longest_game_seconds`,
    `shortest_game_seconds`
    ([`20260620120000_stats_improvements.sql`](../supabase/migrations/20260620120000_stats_improvements.sql))
  - the game detail page ([`src/app/games/[id]/page.tsx`](../src/app/games/[id]/page.tsx))
  - the game list ([`src/components/game-list.tsx`](../src/components/game-list.tsx))
- **No filtering or outlier handling exists.** `avg_duration_seconds` is a plain
  mean over every completed, non-deleted game with an `ended_at`.
- Games **are** already editable: `update_game` accepts `p_started_at` /
  `p_ended_at`, and the edit form exposes both as `datetime-local` inputs
  ([`src/app/games/[id]/edit/edit-game-form.tsx`](../src/app/games/[id]/edit/edit-game-form.tsx)).
  So correcting a bad start time is possible today — it's just undiscoverable and
  requires recalling a wall-clock time the user no longer remembers.

## Reframing: three failure modes, not one

Late starts are the reported symptom, but they're one of three distinct problems,
and they may not be the most damaging one.

1. **Late start** — Start tapped near the end of the real game. Duration is far
   too short. This is the reported problem.
2. **Forgotten finish** — nobody taps Finish until the phone is picked up an hour
   later, or the next morning. Duration is inflated by 10–50×. Because the
   headline stat is a **mean**, a single forgotten finish moves the group average
   more than several 1-minute games do. Worth measuring before optimizing for the
   short tail.
3. **The mean is fragile at this sample size.** With a few dozen games, an
   arithmetic mean is a poor estimator of "how long a game takes" regardless of
   data quality.

## Why a threshold can't do the whole job

The natural instinct is a plausibility floor derived from
`players × time-per-player`. That's directionally right about what drives game
length, and the drivers are available in the data: player count (via
`game_players`) and `deck_count` (36 vs 52 materially changes game length).

The problem is the gray zone. **A 3-player, 36-card Durak game genuinely can end
in 6–8 minutes.** That's a real, playable outcome. The 8-minute game above is
known to be wrong only from human memory — nothing in the row distinguishes "fast
game" from "started tracking late," because the two produce identical data.

So a computed threshold has exactly two defensible jobs:

1. **A hard floor of physical impossibility.** Dealing, setting trump, playing,
   and finishing with 3+ people cannot happen in under ~2–3 minutes. This catches
   the 1-minute game with essentially zero false positives.
2. **A soft floor that triggers a question**, rather than a silent exclusion.

Setting an automatic threshold high enough to catch the 8-minute case would
silently drop legitimately fast games from the stats — an _invisible_ failure,
and a worse one than the problem being fixed. A `players × per-player-minutes`
heuristic is a good basis for deciding **when to ask** and a bad basis for
deciding **what to discard**.

## Options considered

Roughly in order of cost.

### 1. Median instead of mean

Add `median_duration_seconds` to `group_stats` and lead the stats card with
"Typical game" rather than "Avg duration." A median shrugs off both a 1-minute
entry and a 3-hour forgotten finish without requiring any definition of "bad
data." Pure SQL, one migration, no data-model change, no UI decisions.

Corollary: **"Shortest game" is the most bad-data-exposed stat and the least
valuable one.** It's a magnet for exactly this problem. Candidate for removal, or
for being sourced only from timing-confirmed games.

### 2. A per-game "timing unreliable" flag

One boolean column on `games`, excluded from duration stats but **not** from
durak/win stats — a bad clock doesn't invalidate the result. Set two ways:

- manually, as a one-tap action on the game detail page ("timing looks wrong,
  don't count it");
- auto-suggested when the duration falls below the hard impossibility floor.

This is the only mechanism that correctly handles the 8-minute case, because only
a human knows it's wrong. Cost: one migration (column + a `where` clause in
`group_stats`), one write path, one UI affordance. RLS is already covered by the
existing `games_update` policy scope.

### 3. Catch it at finish time

When `finish_game` would produce an implausibly short duration, ask instead of
silently recording — at the moment the player's memory is freshest:

> **This game only ran 1 minute. Did you start tracking late?**
>
> `It really started ~__ ago` · `No, it was that fast` · `Don't count timing for this game`

Three outcomes: a corrected `started_at`, a **confirmation** that lets a genuinely
fast game count, or the exclusion flag from option 2. This turns the floor into a
prompt trigger rather than a filter, which means it can be set generously without
the invisible-false-positive risk.

### 4. Documentation and in-app copy

Necessary but not sufficient — copy alone won't change behavior mid-card-game.

- Start screen: "Tap Start when you deal the first hand — game length is measured
  from here."
- Under the duration stats: show the denominator honestly. The stats page already
  renders `Avg duration (of N)`; extend it to say _why_ some games are excluded.
- A nudge on games left `in_progress` for hours, addressing failure mode 2.

## Working recommendation

Ship **1 + 2 + 4** together, with **3** as a follow-up if late starts persist:
median as the headline stat, a manual exclusion flag with a conservative
auto-suggest floor (impossibility only, ~2–3 min), honest denominators in the UI,
and start-screen copy. That yields accurate numbers without ever silently
discarding a real game.

Hold off on `players × per-player-minutes` as an _automatic_ filter, for the
reasons in the section above.

## Open questions

These need answers before any of this is worth building.

1. **What does the real duration distribution actually look like** — by player
   count and deck size? No constant should be picked without seeing it, and
   specifically without checking for long-tail forgotten-finish games (failure
   mode 2). Requires a `psql` pass over the live DB (see the Database section of
   [CLAUDE.md](../CLAUDE.md)).
2. **How many games are affected?** If it's ~3 rows out of ~40, the cheapest
   correct fix is editing those three by hand and shipping only the median +
   copy so it doesn't recur.
3. **Should flagged games be excluded from durak/win stats too, or duration
   stats only?** Working assumption: duration only — the _result_ stays valid
   even when the clock doesn't.
4. **Retroactive or forward-only?** Fix the existing bad rows (edit or flag), or
   only stop the bleeding going forward?
