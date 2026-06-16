# Roadmap

Milestones 1–7 are complete; M8 (two-part game logging) is next (see
[current-status.md](./current-status.md)). A milestone's PR carries the docs marking
it complete — outstanding manual testing is done before that PR merges. M3 shipped **Google** auth only —
Facebook was deferred to the backlog below. Product intent and non-goals live in
the [spec](../durak-tracker-spec.md).

M7–M10 came out of a real-usage planning pass (see decisions in each milestone). The
app is **pre-release with no live data**, so schema changes can wipe + reseed
([supabase/seed.sql](../supabase/seed.sql)) rather than preserve data. PWA polish and
the open-ended "Iterate" bucket shifted to M11+.

## Remaining milestones (v1)

4. **Core flow** _(done)_ — add players (incl. guests); log a game; persist to
   DB. Introduced Zod + React Hook Form, with min-3-players / exactly-one-durak
   validated client-side and re-checked server-side via the `log_game` RPC.
5. **Game history** _(done)_ — list games per group, most-recent first, with
   a date-range filter scoped to the group's timezone.
6. **Stats v1** _(done)_ — group stats and player stats pages computing the
   spec metrics at all-time, in-group granularity via two `SECURITY INVOKER` RPCs
   (`group_stats` / `player_stats`). Deferred to later milestones: time-span buckets
   (week/month/year), cross-group account-level aggregates, head-to-head, and
   charts (see below).

7. **Home & navigation revamp** _(done)_ — home centers on the user's real group and
   recent activity; management moved to its own screen.
   - Default active group = the group the user has **played the most games in** (cookie
     still wins when set; tie-break earliest-created). Changed the `getCurrentGroup()`
     fallback in [src/lib/data/groups.ts](../src/lib/data/groups.ts) — counts
     `game_players` joined via `players.auth_user_id = auth.uid()`, grouped by group,
     behind the `SECURITY INVOKER` `most_played_group()` RPC so RLS still applies.
   - Home shows the **last 6 games** (newest→oldest). The `/games` history query was
     extracted into a shared helper (`src/lib/data/games.ts`) reused by home and the
     history page (plus a shared `GameList` component).
   - New **`/group` (Manage group)** page holds the group switcher + create-new-group and
     links to **Manage Players** (removed from home). Home shows: Log a game, a group
     stats summary (total games + top durak) linking to full stats, and recent games;
     the group name links to Manage group.

8. **Two-part game logging** _(next)_ — split logging into **start** then **finish**;
   this _replaces_ the one-shot log flow.
   - **Start** records ≥1 player + optional trump/deck; **finish** records the remaining
     players + durak / first-out / last-out. **No time fields in the UI** — `started_at`
     is stamped server-side on start, `ended_at` on finish (editing deferred to a future
     edit-game screen).
   - Data model: add a `game_status` enum (`in_progress` | `completed`) + `games.status`
     (default `in_progress`); rework the deferred integrity triggers so `≥3 players` /
     `exactly-one-durak` apply **only to completed games** (in-progress needs only ≥1
     player). New `start_game` / `finish_game` / add-players RPCs mirroring `log_game`'s
     atomic, `SECURITY INVOKER`, `logged_by = auth.uid()` pattern.
   - UI: `/games/new` → "Start a game"; new `/games/[id]/finish`; in-progress games
     surfaced on home & `/games` with a Resume/Finish CTA. _Largest change in the batch —
     test the negative constraints against the live DB as M2/M4 did._

9. **Start-from-existing + quick add + search** — frictionless back-to-back games with a
   dozen+ players (builds on M8's start flow).
   - "Start again" pre-fills the start form with a prior game's roster.
   - **Add a guest on the fly** inside the start/finish flow (reuse `addPlayerAction`).
   - **Name search over the current group's roster**, ranked by games-played desc.

10. **Account claiming** — a member shares a link tying a guest player to the right
    person's account. Replaces the backlog "group invitations" + "guest player claiming"
    items (folds them into one flow).
    - **Any** group member generates a claim link for a guest player
      (`auth_user_id IS NULL`); links are **single-use, active for 7 days**. New
      `player_claims` table (`token`, `group_id`, `player_id`, `created_by`,
      `created_at`, `expires_at`, `claimed_by`, `claimed_at`).
    - Claim flow: `/claim/[token]` → sign in with Google → `claim_player(token)`
      **`SECURITY DEFINER`** RPC (claimer isn't a member yet) sets `players.auth_user_id`,
      inserts a `group_members` (member) row, and marks the link used. Share via
      copy-link + Web Share API (covers text/email/Messenger).
    - Edge cases: expired / already-claimed token; claimer already a member; the
      one-player-per-user-per-group unique constraint.

11. **PWA polish** _(shifted from M7)_ — manifest, icons, install prompt, offline
    static-asset caching (introduces `next-pwa`).
12. **Iterate** — additional metrics and refinements from real usage.

## Deferred from M6 (stats follow-ups)

- **Time-span buckets** — durak counts and "most durak" per week/month/year, bucketed
  over `started_at` in the group's timezone (the architecture rule is already
  documented; only the UI + queries remain).
- **Cross-group / account-level aggregates** — the spec's per-player cross-group
  stats, for registered players joined via `auth_user_id`.
- **Head-to-head** — each player's durak % against another; still an open question
  below (profile-only vs a dedicated comparison screen).
- **Charts / visualizations** — v1 ships simple numbers only.
- **`round_count`** — the per-game metric isn't captured at log time yet.

## Post-v1 backlog

- **Facebook login** — enable the Facebook provider in Supabase and restore the button
  in `src/app/login/page.tsx` (deferred from M3; see [oauth-setup.md](./oauth-setup.md)).
- **Auth UX polish** — Supabase custom auth domain + Google consent-screen branding so
  the login flow doesn't surface the raw Supabase project domain.
- **Edit/delete game** — scoped to `logged_by` or group owner; soft-delete preferred;
  audit trail. Also the future home for editing `started_at` / `ended_at` (M8 sets them
  server-side, no UI).
- **Offline support** — service worker queues writes locally, syncs on reconnect.
- **Multi-player game confirmation** — multiple players confirm/enter one game;
  conflict resolution TBD.
- **Push notifications** — streak alerts, durak taunts, etc.
- **Native app** — Capacitor wrapper around the PWA for app-store distribution.
- **Separate Dev/test database** — a dedicated Supabase project (or branch) for
  testing, so the seeded **Run Club** test group lives apart from real data. Until
  then the home-page group switcher (M6) lets the owner flip between the seeded group
  and their real group on the production DB.

## Open questions / decisions for later

- **Head-to-head** — surface on the player profile only, or also a dedicated
  comparison screen?
- **Claim-link revocation** (M10) — can a member revoke an unused link before it expires?
- **Cross-group player suggestions** (M9) — when the same person plays in multiple
  groups, suggest them across groups? (Out of scope for M9 — search is current-group
  only.)

_(Resolved: **group switching** — M7 moves it to a dedicated `/group` page and defaults
the active group to most-played. **`ended_at` / `started_at` entry** — M8 stamps both
server-side on start/finish; no time fields in the UI, editing deferred to a future
edit-game screen.)_
