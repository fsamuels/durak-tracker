# Roadmap

Milestones 1–12 are complete; M13 (Iterate) is next
(see [current-status.md](./current-status.md)). A milestone's PR carries the docs marking
it complete — outstanding manual testing is done before that PR merges. M3 shipped **Google** auth only;
M12 added **Facebook** and **Discord** login along with a full account management page.
Product intent and non-goals live in the [spec](../durak-tracker-spec.md).

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
   - New **`/group` (Manage group)** page holds create-new-group and links to **Manage
     Players** + a dedicated **`/group/switch`** tap-to-switch page (both removed from
     home). Home shows: Log a game, a group stats summary (total games + top durak)
     linking to full stats, and recent games; the group name links to Manage group and
     a "Change group" link goes to the switch page. _(Later reworked — the switch page
     was folded back into Manage group; see the **Group management rework** note in
     [current-status.md](./current-status.md).)_

8. **Two-part game logging** _(done)_ — split logging into **start** then **finish**;
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

9. **Start-from-existing + quick add + search** _(done)_ — frictionless back-to-back
   games with a dozen+ players (builds on M8's start flow).
   - **"Start again"** — each completed game in the history/home list links to
     `/games/new?from=<id>`, which pre-selects that game's roster on the start form.
   - **Add a guest on the fly** — a shared inline "Add a guest" control in both the
     start and finish flows reuses `addPlayerAction` (now returns the created player)
     and selects the new guest without leaving the page.
   - **Name search over the current group's roster**, ranked by games-played desc — a
     `group_roster` RPC orders players by completed games (then name); the picker shows
     a client-side search box (>6 players) that filters by name while keeping selected
     players visible.

10. **Account claiming** _(done)_ — a member shares a link tying a guest player to the
    right person's account. Replaces the backlog "group invitations" + "guest player
    claiming" items (folds them into one flow).
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

11. **PWA polish + mobile design pass** _(done; shifted from M7)_ — Web App
    Manifest, generated icons (joker brand mark via Twemoji), an install prompt, and
    offline static-asset caching via a **hand-written service worker** (`next-pwa` was
    evaluated but dropped — it is webpack-only and Next 16 defaults to Turbopack). Grew
    into a broader mobile UX pass: a shared sticky header + hamburger menu and a bottom
    tab bar (Home / Games / Stats / Players) in the root layout, an `/account` stub,
    PWA safe-area insets (`viewport-fit=cover`), 44px touch targets, and a visual
    unification onto the frosted `card-surface` / `app-bg` brand look. Also added
    **discard (delete) an in-progress game** (`discard_game` RPC + `games_delete` RLS)
    and a "selected-only" start-form player picker.
12. **Account management + OAuth expansion** _(done)_ — full `/account` page replacing the
    stub: theme switcher (System / Light / Dark via `next-themes`), global display name
    editor (updates all groups at once), connected sign-in providers with connect/disconnect
    (Supabase `linkIdentity` / `unlinkIdentity`). Added **Facebook** and **Discord** login
    buttons to the login page alongside Google. Navigation cleanup: removed redundant
    `← Home` back links from all secondary pages (header logo already links home); cleaned
    up the hamburger menu (removed "View stats" duplicate, renamed to "Account").
    **Manual step required:** enable Facebook and Discord providers in Supabase dashboard →
    Auth → Providers (see [oauth-setup.md](./oauth-setup.md)). Also enable "Allow manual
    linking" in Supabase Auth settings for the Connect button to work. Facebook requires
    a Meta app in Live mode for public users (app admins can test immediately).

13. **Iterate** — additional metrics and refinements from real usage.

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

## Testing follow-ups

Automated tests should have been part of the project from M1; building milestones 1–11
without them was a real oversight. A Vitest unit/component suite + GitHub Actions CI now
exists (see [current-status.md](./current-status.md)), covering the pure-logic and
validation layers. What remains:

- **Server-action, data-layer & e2e coverage** — the largest gap. Nothing that renders
  React, runs a server action, or touches the database is tested yet: the `actions.ts`
  server actions, `src/lib/data/*` query helpers, the `start_game` / `finish_game` /
  `claim_player` / `discard_game` RPCs, and the RLS cross-group isolation invariants
  (today only checked manually via JWT-simulated `psql`). This needs the **separate
  dev/test database** (see backlog item below) so integration tests and **Playwright**
  e2e flows (login → onboarding → create group → log game) can run against real Postgres
  - RLS without touching production data.
- **Fix coverage reporting** — running the full suite drops the entire
  `src/lib/validation/` directory from the coverage report (reproducible under both the
  v8 and istanbul providers, with and without the project split), so the headline
  percentage understates the tested surface. A single-file run instruments those files
  correctly, confirming the tests do exercise them. Investigate (single-fork /
  `isolate: false`, per-project coverage, or provider tuning) so coverage numbers are
  trustworthy before they gate anything.

## Post-v1 backlog

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

- **Automated DB migrations in CI** — add a `migrate` job to `.github/workflows/ci.yml`
  using `supabase/setup-cli@v1` that runs `supabase db push` on pushes to `main` only
  (not PRs). Requires two GitHub secrets: `SUPABASE_ACCESS_TOKEN` (Supabase dashboard →
  Account → Access Tokens) and `SUPABASE_DB_PASSWORD` (Project Settings → Database).
  Currently migrations are applied manually via `supabase db push` locally.

## Open questions / decisions for later

- **Head-to-head** — surface on the player profile only, or also a dedicated
  comparison screen?
- **Claim-link revocation** (M10) — M10 ships links as single-use + 7-day expiry but
  **no manual revoke** of an unused link. Could add a member-facing list of pending
  links with a delete/expire action (a `delete` RLS policy or a small RPC). Deferred.
- **Cross-group player suggestions** (M9) — when the same person plays in multiple
  groups, suggest them across groups? (Out of scope for M9 — search is current-group
  only.)

_(Resolved: **group switching** — M7 moves it to a dedicated `/group` page and defaults
the active group to most-played. **`ended_at` / `started_at` entry** — M8 stamps both
server-side on start/finish; no time fields in the UI, editing deferred to a future
edit-game screen.)_
