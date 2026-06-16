# Current Status

Living snapshot of what's built. Last updated: 2026-06-16.

- **Live app:** https://durak-tracker.vercel.app
- **Repo:** https://github.com/fsamuels/durak-tracker
- **Current milestone:** M8 — two-part game logging shipped; next up is M9 —
  start-from-existing + quick add + search. (The roadmap was re-sequenced from a
  real-usage planning pass: M7 home revamp, M8 two-part logging, M9 start-from-existing,
  M10 account claiming; PWA polish + Iterate shifted to M11+. See [roadmap.md](./roadmap.md).)

> **Milestone convention:** a milestone's PR carries the docs that mark it
> **complete (✅)**. Any outstanding manual review/testing is done **before that PR
> merges**, so the docs land already reflecting completion — the moment it hits
> `main`, the milestone reads as done. Anything still outstanding other than manual
> testing must be **explicitly deferred** to a future milestone/feature — no
> implied-partial TODOs.

## Done

### Milestone 1 — Project scaffold & deploy ✅

- Next.js (App Router) + TypeScript + Tailwind v4, `src/` layout, pnpm.
- ESLint (flat config) + Prettier wired together; `lint` and `format:check` clean.
- "Hello Durak Tracker" landing page + app metadata.
- Public GitHub repo; **Vercel auto-deploy on push to `main`** (CI/CD confirmed end
  to end via the live URL).

### Milestone 2 — Schema ✅

- Supabase project `durak-tracker` (ref `wjdubpkmzhsfocvgsjuv`, `us-east-2`, PG 17).
- Full v0.3 schema applied via `supabase db push`:
  `trump_suit` enum; `groups` (with `timezone`), `group_members`, `players`,
  `games`, `game_players`; FK + partial-unique indexes; CHECK constraints.
- Integrity: deferred constraint triggers (min-3-players, exactly-one-durak);
  mutual-exclusion CHECK; `updated_at` triggers.
- RLS on all tables via `group_members`; `SECURITY DEFINER` helpers; `create_group`
  onboarding RPC.
- `supabase/seed.sql` (1 group, 4 players incl. 2 guests, 4 games).
- **Validated against the live DB:** all four negative constraint tests rejected;
  RLS cross-group isolation confirmed; `create_group` verified; core stats queries
  (durak rate, trump frequency, avg duration, last durak) return correct results.

### Milestone 3 — Auth ✅

**Tested end to end with Google** (login → onboarding → create group → protected
home):

- `@supabase/ssr` + `@supabase/supabase-js`; generated DB types
  (`src/lib/supabase/database.types.ts`).
- Browser + server Supabase clients; `proxy.ts` session refresh + route protection
  (verified: `/` and `/onboarding` redirect to `/login` when unauthenticated).
- Login page (**Google**; Facebook button removed until the provider is configured);
  `/auth/callback` + `/auth/signout` routes.
- Onboarding page → `create_group` RPC; protected home (redirects to login /
  onboarding).
- Supabase: **Google** provider enabled; URL config set (Site URL + `localhost` /
  Vercel redirect allow-list). Publishable key in `.env.local`.

Deferred out of M3 to the [roadmap](./roadmap.md) post-v1 backlog: **Facebook
login** (re-enable provider + restore the button in `src/app/login/page.tsx`; see
[oauth-setup.md](./oauth-setup.md)) and **auth UX polish** (custom auth domain +
consent-screen branding — see "Polish / UX backlog" below).

### Milestone 4 — Core flow ✅

Add players (incl. guests) and log a game, persisted to the DB:

- Installed **Zod** + **React Hook Form** (`@hookform/resolvers`).
- Shared Zod schemas (`src/lib/validation/`): add-player; log-game with the
  **min-3-players / exactly-one-durak** invariants validated client-side and
  re-validated in the server action.
- **`log_game` RPC** (migration `20260616060126_log_game.sql`, pushed to remote;
  types regenerated). Inserts the game + all `game_players` in one transaction so
  the deferred integrity triggers validate at COMMIT — two separate PostgREST
  inserts can't (the game would commit player-less). `SECURITY INVOKER`, so RLS
  still gates every row; `logged_by` is set from `auth.uid()`.
- Screens: `/players` (list + add-player form) and `/games/new` (log-game form
  with per-player outcome selects, optional trump/deck/notes/times). Home links to
  both. `getCurrentGroup()` resolves the user's group (single-group for now).
- **Verified:** `pnpm lint` / `build` / `format:check` clean; `log_game` tested
  against the live DB via JWT-simulated psql (valid game OK; 2-players,
  zero-durak, and unauthenticated all rejected; every test rolled back). Changes
  reviewed and merged via PR.

### Milestone 5 — Game history ✅

List a group's games so the crew can see who's been the durak:

- **`/games`** server component: auth + `getCurrentGroup()` + an RLS-scoped query
  over `games` (uses the existing `games(group_id, started_at desc)` index, capped
  at 100). Each row shows the start time (rendered in the group's timezone), the
  durak, the participants, and trump suit / deck count when present. Embeds
  `game_players → players` in one PostgREST select.
- **Date-range filter** (`?start=&end=`): a small client component (`history-filter.tsx`)
  pushes the bounds to the URL; the server re-validates with a shared **Zod** schema
  (`src/lib/validation/history.ts`). Dates are wall-clock days in the group's
  timezone, converted to UTC instants via `src/lib/time.ts` (DST-aware, `gte` start /
  `lt` next-day-after-end). Empty state distinguishes "no games yet" from "none in
  this range".
- Home links to the history page; logging a game now redirects to `/games`.
- **Verified:** `pnpm lint` / `build` / `format:check` clean; changes reviewed
  and merged via PR.

Deferred out of M5 (see [roadmap](./roadmap.md)): **edit/delete game** and
**pagination** beyond the simple 100-row cap. `ended_at` is queried but not yet
surfaced in the row UI. (Per-player stats landed in M6.)

### Milestone 6 — Stats v1 ✅

Group- and player-level stats, computed from stored data (spec "Metrics"):

- **Stats migration** (`20260616120000_stats.sql`, pushed to remote; types
  regenerated). Two `SECURITY INVOKER` SQL functions — `group_stats(group_id)` and
  `player_stats(group_id, player_id)` — each returns one `jsonb` blob so the page
  does a single round trip; RLS still scopes every row to the caller's groups,
  mirroring M4's `log_game`. Raw counts come back; rates/percentages are derived in
  TS. Streaks are computed in SQL via gaps-and-islands over the player's
  participated games ordered by `started_at`.
- **`/stats`** (server component): games played, avg game duration (over games with
  both times), last durak, most durak, per-player leaderboard (games / durak count +
  rate / first- & last-out counts), games-per-player min/max/avg, and trump-suit
  frequency with %. Times rendered in the group's timezone.
- **`/stats/players/[playerId]`** (server component): the same player scoped to one
  player — durak / first-out / last-out counts & rates, plus current/longest durak
  and win (first-out) streaks. Route param validated with **Zod** (`z.uuid()`); the
  player is re-checked against the current group (defense in depth) → `notFound()`
  otherwise. Both pages parse the RPC result with Zod for a typed shape.
- **Empty states**: group with no games → "Log a game"; player with no games → a
  "hasn't played any games yet" message.
- Home links to group stats; the players list and the group leaderboard link to each
  player's stats page.
- **Group switcher (dev/testing convenience):** the home "Your groups" list is now
  tappable; a `switchGroup` server action stores the choice in a cookie
  (`durak_group_id`) that `getCurrentGroup()` reads (falling back to earliest-created
  when unset/invalid), so a user in more than one group can flip the active group that
  stats / history / players key off. Added so the owner can test against the seeded
  **Run Club** group and their real group from one account — a stop-gap until a
  separate Dev DB exists (see [roadmap](./roadmap.md)). The owner account was added to
  Run Club manually (group_members + a `players` row) via psql; this is live-DB data,
  not a migration.
- **Verified:** `pnpm lint` / `build` / `format:check` clean; migration applied via
  `db push` (Postgres validated the function definitions on create); manual
  review/test pass done before merge.

Deferred out of M6 (see [roadmap](./roadmap.md)): **time-span buckets**
(per week/month/year durak counts / "most durak this week"), **cross-group /
account-level aggregates** (registered players only), **head-to-head**, and any
**charts/visualizations** beyond simple numbers. The per-game `round_count` metric
isn't captured at log time yet, so it isn't surfaced. Linking to player stats from
the history list was left out (history doesn't carry player ids); links come from
home, the players list, and the group leaderboard.

### Milestone 7 — Home & navigation revamp ✅

Home centers on the user's real group and recent activity; group management moved
to its own screen:

- **Default active group = most-played** (`20260616130000_most_played_group.sql`,
  pushed to remote; types regenerated). A `SECURITY INVOKER` `most_played_group()`
  RPC counts the caller's `game_players` (joined via `players.auth_user_id =
auth.uid()`) grouped by group, tie-break earliest-created, over a `LEFT JOIN` of
  every member group so a user with no games still resolves. `getCurrentGroup()` now
  uses it: the `durak_group_id` cookie still wins; the RPC is the fallback; an
  earliest-created query is the defensive last resort. RLS still scopes every row.
- **Last 6 games on home.** The `/games` history query was extracted into a shared
  `src/lib/data/games.ts` (`getGameHistory`) reused by home (limit 6, no filter) and
  the history page (capped, date-range filter). Row markup moved to a shared
  `src/components/game-list.tsx` (`GameList`).
- **New `/group` (Manage group) page** links to Manage Players, to the switch page,
  and holds the create-new-group form. The create form was generalized into
  `src/components/create-group-form.tsx` (reused by onboarding); `createGroupAction`
  moved to `src/app/actions.ts` and now sets the active-group cookie so a just-created
  group becomes active.
- **Dedicated `/group/switch` page** — a simple tap-to-switch list of the user's
  groups (the switcher was pulled out of Manage group).
- **Group switching root-cause fix (`z.uuid()` → `z.guid()`).** The switcher "did
  nothing" because `switchGroup` validated the posted `groupId` with `z.uuid()`, and
  Zod 4's `z.uuid()` enforces RFC-9562 version/variant bits — which the DB's ids
  (e.g. `a0000000-…` groups, `b0000000-…` players) don't satisfy — so the action
  failed validation and returned early. Same strictness silently blanked the stats
  pages (the `group_stats`/`player_stats` result parse), the player-stats route param,
  and `log_game` participant validation. Switched all five id checks to `z.guid()`
  (shape-only, still accepts real v4 ids). `switchGroup` also now
  `revalidatePath("/", "layout")` before `redirect("/")` so the post-switch home isn't
  served stale from the client Router Cache.
- **Home layout.** A single primary **Log a game** action; the group name links to
  `/group` and a "Change group →" link beside it goes to `/group/switch`; a **Group
  stats** summary card
  (total games played + top durak, "More stats →" to `/stats`); and **Recent games**
  (last 6, "View all →" to `/games`). The standalone Game history / Group stats /
  Manage group buttons were dropped — those destinations are reachable from the new
  inline links — leaving a cleaner page that surfaces more information. The signed-in
  account is shown on the sign-out button at the bottom (**Sign out as &lt;email&gt;**)
  rather than a separate "Signed in as" line.
- **Verified:** `pnpm lint` / `build` / `format:check` clean; migration applied via
  `db push` (Postgres validated the function on create). `most_played_group()` tested
  against the live DB via JWT-simulated psql as real members — the owner (8 games in
  Test Group, 0 in Walla Walla) resolves to Test Group, a single-group member gets
  their group, and a non-member gets null (RLS holds).

### UI polish — aurora theme refresh ✅ (non-milestone)

A visual pass on top of M7 (branch `ui-tweaks`); no schema or data changes.

- **Brand theme via design tokens.** `src/app/globals.css` defines an "aurora"
  gradient palette (teal → blue → violet → pink) plus reusable utility classes —
  `.btn-brand` (gradient CTA), `.app-bg` (soft brand-tinted background glows),
  `.card-surface` (frosted card), `.text-brand-gradient` (gradient headings).
  Applied across login, onboarding, home, the game list, and the log-game /
  create-group forms; light + dark mode aware. Retuning the palette is a
  one-place token edit.
- **Google icon** added to the *Continue with Google* button (official multicolor
  "G" mark, inline SVG in `src/app/login/page.tsx`).
- **Home stats refresh** (supersedes M7's "total games played + top durak" card):
  a **🤡 Last durak** heading block under the *Log a game* button, then a **Group
  stats** section with **games played** + **avg game time** side by side and a
  full-width **most durak** card (full width so longer names fit). Avg game time
  reuses the existing `formatDuration` helper and the `group_stats` RPC's
  `avg_duration_seconds` — no new query.
- **Verified:** `tsc --noEmit` / `eslint` clean.

### Milestone 8 — Two-part game logging ✅

Logging is split into **start** (game created in-progress with a roster) and
**finish** (record outcomes + mark completed). Replaces the M4 one-shot flow.

- **Schema** (`20260616140000_two_part_logging.sql`, pushed to remote; types
  regenerated). New `game_status` enum (`in_progress` | `completed`) +
  `games.status` (default `in_progress`; existing games backfilled to
  `completed`) + a `games (group_id, status)` index. The deferred integrity check
  (`check_game_player_integrity`) is now **status-aware**: an in-progress game
  needs only **≥1 player**; the **≥3 players / exactly-one-durak** invariants apply
  only once a game is **completed** (re-checked when finish flips the status).
- **RPCs** `start_game` and `finish_game` (`SECURITY INVOKER`, `logged_by =
  auth.uid()`, mirroring `log_game`). `start_game` inserts the game + starting
  roster, stamping `started_at`. `finish_game` is **authoritative**: it stamps
  `ended_at`, flips status to completed, and reconciles the roster (upserts
  outcomes onto starters, inserts latecomers, drops no-shows) — all in one
  transaction so the deferred trigger validates at COMMIT. `log_game` (M4) is left
  in place but unused; a standalone add-players RPC was folded into `finish_game`'s
  reconciliation (deferred as a separate RPC).
- **RLS:** two-part logging makes `games` and `game_players` **updatable** (and
  `game_players` **deletable**) by group members — a deliberate departure from the
  v1 insert-only stance, needed to finish a game. Scope mirrors the existing select
  policies (`is_group_member` / `is_member_of_game`). General-purpose edit/delete of
  a game remains a deferred roadmap item; the app only mutates via the RPCs.
- **Stats scoped to completed games** (`20260616150000_stats_completed_only.sql`):
  `group_stats` / `player_stats` re-defined with a `status = 'completed'` filter so
  an in-flight game doesn't skew counts, "last durak", or durations.
- **UI:** `/games/new` is now **"Start a game"** (pick ≥1 player + optional
  trump/deck/notes; no time/outcome fields). New **`/games/[id]/finish`** pre-fills
  the started roster, lets you add/remove players and set each outcome, then saves.
  **No time fields** anywhere — `started_at` / `ended_at` are stamped server-side
  (editing deferred to a future edit-game screen). In-progress games are surfaced on
  **home** and **`/games`** via a shared `InProgressGames` component with a
  **Finish →** CTA; the completed history list (and home "recent") excludes them.
- **Verified:** `pnpm lint` / `build` / `tsc --noEmit` clean (Prettier clean on
  changed files). Migrations applied via `db push`; types regenerated from remote.
  Constraint behaviour tested against the live DB via JWT-simulated psql (rolled
  back, deferred triggers forced with `SET CONSTRAINTS ALL IMMEDIATE`): start with
  ≥1 player OK; start with 0 players rejected; finish with 2 players rejected; finish
  with 3 + one durak OK (incl. adding a latecomer); finish with zero durak rejected;
  unauthenticated rejected; and in-progress games confirmed excluded from
  `group_stats`. Owner does the manual UI pass before merge (per the convention).

## Not yet implemented

- Libraries planned but not installed: **next-pwa**, **Vitest/Playwright**.
- PWA layer (manifest, icons, install prompt, service worker).
- Roadmap features: start-from-existing (M9), account claiming (M10); then PWA,
  edit/delete game, offline, etc.

## Action required (owner)

- [ ] 🔐 **SECURITY — rotate the credentials pasted in chat:**
  - [ ] Reset the **database password** (Supabase → Settings → Database → Reset
        database password), then update `SUPABASE_DB_PASSWORD` in `.env.local`.
  - [ ] Revoke/regenerate the **personal access token** `sbp_…` (Supabase → Account →
        Access Tokens), then re-run `supabase login` with the new one.
- [x] ~~Provide the **anon/publishable** key~~ — done (`sb_publishable_…` in
      `.env.local`). `SUPABASE_SERVICE_ROLE_KEY` still blank but not needed until we
      add server-side admin operations.

## Polish / UX backlog

- [ ] **Clean up & improve group management.** The `/group` (Manage group) and
      `/group/switch` pages are functional but rough — the layout, hierarchy, and
      discoverability aren't where they should be (e.g. switching vs. managing vs.
      creating all feel like a stopgap). Revisit the whole group-management flow as a
      focused pass when it becomes a priority; not blocking for now.
- [ ] **Review the auth-flow text/branding.** The Google consent screen currently
      shows the raw Supabase project domain (`wjdubpkmzhsfocvgsjuv.supabase.co`, i.e.
      `NEXT_PUBLIC_SUPABASE_URL`), which can look untrustworthy to users. Options to
      evaluate: a **Supabase custom auth domain** (so the callback shows a branded
      domain) and tightening the **Google OAuth consent screen** app name/branding.
      Also review our own login/onboarding copy while we're there.

## Housekeeping

- Unused default `public/*.svg` assets from create-next-app can be removed.

## Credentials & secrets

- All secrets live in **gitignored `.env.local`**; `.env.example` is the committed
  template. Supabase auth token lives in the CLI keychain, not in any file.
