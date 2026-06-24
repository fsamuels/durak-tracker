# Current Status

Living snapshot of what's built. Last updated: 2026-06-24.

- **Live app:** https://durak-tracker.vercel.app
- **Repo:** https://github.com/fsamuels/durak-tracker
- **Current milestone:** M12 — account management + OAuth expansion shipped; next up is
  M13 — Iterate. (The roadmap was re-sequenced from a real-usage planning pass: M7
  home revamp, M8 two-part logging, M9 start-from-existing, M10 account claiming, M11
  PWA + mobile UX, M12 account management + OAuth; Iterate is M13+. See [roadmap.md](./roadmap.md).)

> **Milestone convention:** a milestone's PR carries the docs that mark it
> **complete (✅)**. Any outstanding manual review/testing is done **before that PR
> merges**, so the docs land already reflecting completion — the moment it hits
> `main`, the milestone reads as done. Anything still outstanding other than manual
> testing must be **explicitly deferred** to a future milestone/feature — no
> implied-partial TODOs.

## In progress

### Single game detail page 🚧 (non-milestone)

Added a dedicated detail page at `/games/[id]` for every completed game.

- **Entry points** — every game card on the home page and the game history page is now
  a tappable link to the detail page (absolute-cover link pattern; "Play again" and "Edit"
  remain functional via `relative z-10`).
- **Detail page** — shows start time, end time, duration, trump suit, deck count, notes,
  and "logged by". Each player is listed with their outcome badge (Durak, First out, Last
  out) and links directly to their stats page (`/stats/players/[id]`). Edit and Play again
  actions appear at the bottom.
- **Data layer** — new `getGameDetail` / `GameDetail` export in `src/lib/data/games.ts`
  queries the full game row including `notes` and `player_id` (needed for the stats links),
  with a secondary query to resolve the logger's display name.
- **Files:** `src/app/games/[id]/page.tsx` (new), `src/components/game-list.tsx` (cover
  link + `z-10` on action row), `src/lib/data/games.ts` (`getGameDetail`).

### Player-selection redesign — exploration 🚧 (non-milestone)

Evaluating a faster player picker for the start / edit / finish flows (branch
`player-selection-improvements`). Real-usage feedback: the M9 search-to-add picker is
great for the long tail but slower than the old click-the-whole-list for the dozen
**regulars** a group actually plays with. We want a hybrid that keeps both.

- **Throwaway demo route** — `/games/selector-demo` (auth-gated like the rest of
  `/games`) renders three candidate patterns on the **group's real roster** (ranked by
  games-played, with avatars — via the same `getGroupRoster` + `getGroupAvatars` the
  start/finish pages use): **Regulars + Search** (top players as one-tap chips, search
  reaches the tail), **Filter-in-place** (full tappable list the old way, search narrows
  it), and **Chip grid** (whole roster as toggle chips). A **mode toggle** previews both
  flows — _Pick players_ (Start / Edit) and _Record result_ (Finish, with a one-tap
  segmented durak / first-out / last-out control whose live validation reuses the real
  `outcomeCountError`). Selection / outcome state is local demo state (nothing is saved);
  the **Add a guest** control appends to the in-memory roster only (no DB write).
- **Entry points** — an **"Explore other player selection ideas →"** link sits below the
  action buttons on the **Start** (`/games/new`) and **Finish** (`/games/[id]/finish`)
  pages while we evaluate.
- **Files:** `src/app/games/selector-demo/{page.tsx,selector-demo.tsx,players.ts}` plus
  the two links above. The demo route is self-contained and **safe to delete** once a
  direction is chosen.
- **Status:** deployed for on-device evaluation (Vercel PR preview); **no decision yet**,
  and the real `StartGameForm` / `EditGameForm` / `FinishGameForm` are **unchanged**.
  Once a variant is picked, it gets wired into those against the live roster +
  `addPlayerAction`, and this demo route + the temporary links are removed.

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

Deferred out of M6 (see [roadmap](./roadmap.md)): **cross-group /
account-level aggregates** (registered players only) and any
**charts/visualizations** beyond simple numbers. The per-game `round_count` metric
isn't captured at log time yet, so it isn't surfaced. Linking to player stats from
the history list was left out (history doesn't carry player ids); links come from
home, the players list, and the group leaderboard. **Time-span buckets** and
**head-to-head** shipped later in Stats v2 (below).

### Stats v2 — windows, head-to-head, recent form ✅

Extends M6 (migration `20260620120000_stats_improvements.sql`, pushed; types
regenerated). See [architecture.md](./architecture.md#stats-v2--time-windows-head-to-head-recent-form)
for the RPC details.

- **Time-span toggle.** `group_stats` / `player_stats` gained a `p_window`
  (`all`/`week`/`month`/`year`, group-timezone bucketed); both pages render a segmented
  toggle as links (`?window=`), keeping them server components. On the player page the
  window scopes the headline counts; streaks (labelled "all-time") and recent form are not
  windowed.
- **Head-to-head.** New `head_to_head` RPC → a per-opponent durak-split list on the
  player page; `group_stats` returns the group's **biggest rivalry** card.
- **Recent form.** `player_stats.recent_form` → a chip strip of the last 10 results.
- **Longest / shortest game** cards added to `/stats`; the **"Games per player"** stat
  moved up into the primary overview (below "Most durak").
- **Champion + rate sort.** The leaderboard re-sorts by durak rate and highlights the
  lowest-rate "champion" (min 3 games).
- **Verified:** `tsc` / ESLint / Prettier clean; **117** unit tests pass (new coverage for
  the windows, head-to-head, and recent-form schemas); all four RPCs runtime-checked
  against the live DB via `psql` (window buckets, rivalry, durations, recent form, and the
  opponent splits all return correct data).

Still deferred to Stats v3 (see [roadmap](./roadmap.md)): cross-group aggregates, durak
rate by trump suit, streaks on the group leaderboard, and table-size/deck distribution.

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
- **Google icon** added to the _Continue with Google_ button (official multicolor
  "G" mark, inline SVG in `src/app/login/page.tsx`).
- **Home stats refresh** (supersedes M7's "total games played + top durak" card):
  a **🤡 Last durak** heading block under the _Log a game_ button, then a **Group
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

### Milestone 9 — Start-from-existing + quick add + search ✅

Frictionless back-to-back games with a dozen+ players, building on M8's start flow:

- **Roster ranking RPC** (`20260616160000_group_roster.sql`, pushed to remote; types
  regenerated). `group_roster(group_id)` — `SECURITY INVOKER`, like `most_played_group`
  / `group_stats` — returns the group's players ranked by **completed** games played
  (desc), then name. Guests and never-played members still appear (LEFT JOIN,
  `games_played = 0`). Backs a new `getGroupRoster` data helper
  (`src/lib/data/players.ts`) used by both the start and finish pages (replacing their
  alphabetical `players` queries).
- **Name search** — the start/finish player pickers show a client-side search box once
  the roster exceeds 6 players. It filters rows by name as you type but always keeps
  **selected** players visible, so searching never hides who's already in. Ranking is
  server-side (the RPC); search is pure client-side filtering over the loaded roster —
  no extra round trip.
- **Add a guest on the fly** — a shared `AddGuestInline` component
  (`src/components/add-guest-inline.tsx`) in both flows reuses `addPlayerAction`, which
  now returns the created player (`{ id, display_name }`). On success the new guest is
  appended to the field array **pre-selected**, so a walk-up player is added without
  leaving the start/finish screen. Validation mirrors the standalone add-player form
  (shared `addPlayerSchema`).
- **"Start again"** — each completed game in `GameList` (home + history) links to
  `/games/new?from=<gameId>`. The start page validates `from` (`z.guid()`), loads that
  game's roster via a new `getGameParticipantIds` helper, and passes it as
  `preselectedIds` so the prior roster is pre-checked. Unknown/foreign ids are ignored
  (RLS-scoped), and players since removed simply don't pre-select — no crash.
- **Demo seed decision (resolved):** the 36 Walla Walla Run Club demo games **stay in**
  the canonical `supabase/seed.sql` (not split into a standalone `supabase/demo/`
  script), so a fresh reseed always reproduces the populated group the owner flips to
  for testing.
- **Verified:** `pnpm tsc --noEmit` / `lint` / `build` clean; Prettier clean on changed
  files (incl. the regenerated types). Migration applied via `db push`; types
  regenerated from remote. `group_roster` tested against the live DB via JWT-simulated
  psql as authenticated members (`current_user = authenticated`, in a transaction so
  `SET LOCAL` applies): ranking ordered games-played desc (Michael tops Walla Walla at
  25), all 20 players returned incl. zero-game guests, the non-increasing order
  invariant holds; and RLS holds — a non-member and a cross-group member both get 0
  rows for a group they don't belong to, while their own group returns the full roster.
  Owner does the manual UI pass before merge (per the convention).

### Milestone 10 — Account claiming ✅

A group member shares a single-use link that ties a guest player to the right
person's account. Folds the backlog "group invitations" + "guest player claiming"
items into one flow — claiming a player both links the account and joins the group:

- **Schema** (`20260616170000_player_claims.sql`, pushed to remote; types
  regenerated). New `player_claims` table (`token` PK, `group_id`, `player_id`,
  `created_by`, `created_at`, `expires_at` default `now() + 7 days`, `claimed_by`,
  `claimed_at`) — links are **single-use, active 7 days**. Added the
  **`players_one_account_per_group`** partial unique index
  (`(group_id, auth_user_id) where auth_user_id is not null`) — the
  one-account-per-person-per-group guard the claim flow relies on, which didn't
  exist before M10. RLS: members can `select` / `insert` claims for their own
  groups; the redemption lifecycle goes through the RPCs (no client update/delete).
- **RPCs.** `create_player_claim(player_id)` — `SECURITY INVOKER` (RLS gates the
  player it can see), additionally requires the player to still be a guest.
  `claim_details(token)` and `claim_player(token)` are **`SECURITY DEFINER`**
  because the claimer isn't a group member yet (RLS would hide the group/player and
  block the `group_members` insert). `claim_details` returns a coarse status
  (`valid` / `expired` / `claimed` / `not_found`) + group/player names for the
  landing page (granted to `anon` too, for signed-out visitors). `claim_player`
  locks the claim row `for update`, validates not-used / not-expired / still-a-guest
  / caller-has-no-player-in-group, then links the player, inserts the membership,
  and stamps the link used — all in one transaction.
- **UI.** `/players` shows a **"Share claim link"** button on each **guest** row
  (`ClaimLinkButton`) — mints a link and shares via the **Web Share API** (text /
  email / Messenger), falling back to copy-to-clipboard. New public
  **`/claim/[token]`** page (added to `PUBLIC_PATHS`) shows who/what is being
  claimed and the link status; signed-out visitors get a **Sign in with Google**
  CTA that returns to the claim page (`/auth/callback?next=/claim/<token>`),
  signed-in non-members get a **Claim** button, and the expired / already-claimed /
  already-a-member cases each render a clear message.
- **Verified:** `pnpm tsc --noEmit` / `lint` / `build` clean; Prettier clean
  (incl. regenerated types). Migration applied via `db push`; types regenerated
  from remote. RPCs tested against the live DB via JWT-simulated psql (one
  transaction, rolled back; a throwaway `auth.users` claimer): mint-for-guest OK;
  mint on a linked player rejected ("already linked"); mint on an unseeable player
  rejected via RLS ("not found"); `claim_details` valid→claimed; redeem links the
  player + adds the membership + marks the link used; re-redeem rejected ("already
  used"); expired link rejected (details + redeem); caller who already has a player
  in the group rejected; unauthenticated rejected. Owner does the manual UI pass
  before merge (per the convention).

### Milestone 11 — PWA polish + mobile design pass ✅

Turns the app into an installable PWA and does a focused mobile UX/consistency pass.
No data-model changes beyond the discard RPC below.

- **PWA layer.** Web App Manifest via Next's `app/manifest.ts` (standalone display,
  dark theme, portrait); generated icons via `next/og` `ImageResponse` — `app/icon.tsx`
  (favicon), `app/apple-icon.tsx` (Apple touch), and `app/icons/[size]/route.tsx`
  (192 / 512 / maskable-512), all rendering the **🃏 joker brand mark** through
  **Twemoji** (the default OG font lacks color emoji). A dismissible **install prompt**
  and a **hand-written service worker** (`public/sw.js`, registered by `service-worker.tsx`)
  that cache-firsts Next static assets / icons for offline shell loading. **`next-pwa`
  was evaluated and dropped** — it's webpack-only and Next 16 defaults to Turbopack (the
  build errors on a webpack config) — so the SW is hand-written instead. The install
  prompt uses `useSyncExternalStore` to subscribe to the `beforeinstallprompt` event
  (Chrome/Edge only); on iOS Safari, a fallback banner guides users to
  Share → Add to Home Screen. A tiny inline script in the root layout captures the event
  before React hydrates to avoid a race condition.
- **Shared navigation.** A sticky **header** (joker wordmark → home + hamburger
  `NavMenu`) and a fixed **bottom tab bar** (`BottomNav`: Home / Games / Stats /
  Players) now live in the root layout, rendered for signed-in users on every page.
  The hamburger menu holds **Start a game · View stats** then **Switch group · Manage
  group · Manage account · Sign out**. New **`/account`** stub page (shows the
  signed-in email + sign-out; settings deferred). Footer carries the repo link and
  "Logged in as &lt;email&gt;".
- **Mobile correctness & touch.** `viewport-fit=cover` + `env(safe-area-inset-*)`
  padding on the header / footer / bottom bar / install prompt (fixes content under the
  iOS notch in the installed PWA, given the `black-translucent` status bar); per-scheme
  `themeColor`; 44px minimum touch targets (hamburger, filter/claim buttons) with
  `active:` press feedback.
- **Visual unification.** `.app-bg` moved to `<body>` (base color baked in, glows
  fixed to the viewport) so every page shares the ambient gradient; all remaining plain
  `rounded-lg` white cards (Stats, player stats, Players, Switch group, start/finish
  player rows, empty states) migrated to the frosted **`card-surface rounded-2xl`**
  brand look. Brand mark unified on the **joker** across header, auth heroes, and app
  icons (was a mix of 🃏 and ♠️). Durak badge recolored from flat red to the aurora
  **pink** (`.badge-durak`); recent-games rows show their **duration**; "Start again
  with this roster" → **"Play again"**.
- **Discard a game** (`20260617120000_discard_game.sql`, pushed to remote; types
  regenerated). A started-but-unfinished game can be **discarded (deleted)** from the
  finish page — `discard_game(game_id)` (`SECURITY INVOKER`) deletes the game and
  cascades to `game_players`, gated by a new **`games_delete`** RLS policy scoped to
  group members and **`status = 'in_progress'`** only (completed games stay an edit/
  delete roadmap item).
- **Start-form player picker** now lists **only selected** players (each with Remove),
  with search-to-add surfacing the rest of the roster — instead of showing the whole
  roster as checkboxes.
- **Verified:** `pnpm tsc --noEmit` / `lint` / `build` clean. Migration applied via
  `db push`; `discard_game` (SECURITY INVOKER) and `games_delete` (delete policy)
  confirmed present in the live DB. Generated joker icon visually verified (real
  Twemoji jester card, not a tofu box). Owner does the manual UI pass before merge
  (per the convention).

### Milestone 12 — Account management + OAuth expansion ✅

Full `/account` page replacing the stub:

- **Theme switching** — System (default) / Light / Dark via `next-themes`. Injects a
  blocking script before first paint to avoid flash. Tailwind v4 dark variant updated
  to class-based (`@variant dark (&:where(.dark, .dark *))`); CSS variables migrated from
  `@media (prefers-color-scheme: dark)` to `.dark { ... }` selectors.
- **Display name editor** — single global name field; updates all `players` rows linked
  to `auth_user_id` at once. Server action with Zod validation (trimmed, 1–50 chars),
  success/error feedback inline.
- **Sign-in methods** — shows each provider (Google / Facebook / Discord) as connected or
  unconnected. "Disconnect" calls Supabase `unlinkIdentity`; disabled when only one
  provider is linked to prevent lockout. "Connect" calls Supabase `linkIdentity` with
  `redirectTo: /auth/callback?next=/account`.
- **Facebook + Discord login** — added buttons to the login page alongside Google.
  Provider SVG icons (official Facebook `f` mark in #1877F2; Discord Clyde in #5865F2).
- **Navigation cleanup** — removed redundant `← Home` back links from all secondary pages
  (`/games`, `/stats`, `/players`, `/group`, `/account`); header logo already links home.
  Hamburger menu cleaned up: removed "View stats" (it's in the bottom nav); renamed
  "Manage account" → "Account".
- **Manual steps required (owner):**
  - Enable Facebook provider in Supabase → Auth → Providers (see
    [oauth-setup.md](./oauth-setup.md)). Facebook requires Meta app Live mode for public
    users; works immediately for app admins/testers.
  - Enable Discord provider in Supabase → Auth → Providers (no review gate, works for
    any Discord user).
  - Enable **"Allow manual linking"** in Supabase → Auth → Settings for the Connect
    button to work.
- **Verified:** `pnpm lint` / `format:check` / `test` (64 tests passing) / `build` clean.
  TypeScript clean. Owner does manual UI pass before merge.

### Admin area — account authority v0 ✅ (non-milestone)

First operator-only area, at `/admin`, reachable from the hamburger menu (the link
renders only for admins). Groundwork for a future "account authority" role.

- **Authorization** — single [`isAdmin`](../src/lib/admin.ts) helper, today an
  email allowlist (`ADMIN_EMAILS` = `fsamuels@gmail.com`, case-insensitive). The page
  returns `notFound()` for non-admins so the area isn't advertised; the menu link is
  gated by the same check passed from the root layout. Planned: move the allowlist to a
  DB-backed authority model — `isAdmin` is the only call site to change.
- **First feature: external authenticated accounts** — lists every external (OAuth)
  identity in the system (Google / Facebook / Discord), newest sign-in first, with
  provider, name/email, and linked / last-sign-in timestamps.
- **Service-role path** — the first server-side use of `SUPABASE_SERVICE_ROLE_KEY`.
  [`createAdminClient`](../src/lib/supabase/admin.ts) (RLS-bypassing, server only) backs
  [`listExternalAccounts`](../src/lib/data/accounts.ts). Full model in [admin.md](./admin.md).
- **GoTrue bypass** — `auth.admin.listUsers` returns HTTP 500 `unexpected_failure`
  ("Database error finding users") on this project. Fixed by a `SECURITY DEFINER`
  function `admin_list_external_accounts()` (`20260620000001_admin_list_users.sql`) that
  queries `auth.users ⋈ auth.identities` directly, granted to `service_role` only.
  `listExternalAccounts` calls it via `supabase.rpc()`.
- **Verified:** `pnpm lint` / `format:check` / `test` (101 tests passing) / `build`
  clean. Note: `SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel (already required) for
  the accounts list to load.

### Automated test suite ✅ (non-milestone)

> **Candid note:** an automated test suite should have existed from **M1**. Shipping
> milestones 1–11 with zero automated tests — leaning entirely on manual checks and
> JWT-simulated `psql` for DB invariants — was a significant oversight in how this
> project was built. This entry is the first step at correcting it; the follow-ups
> below are the rest.

- **Vitest** (two projects: a Node env for `src/lib`, jsdom + React Testing Library
  for components); `pnpm test` / `test:watch` / `test:coverage`. **64 tests** cover the
  timezone helpers ([src/lib/time.ts](../src/lib/time.ts)) and every Zod schema
  ([src/lib/validation/\*](../src/lib/validation/)), plus the `BottomNav` active-tab
  logic.
- **CI** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs lint →
  format:check → test → build on every push/PR. Free on GitHub-hosted standard runners
  (public repo).
- **Coverage today:** the pure-logic / validation layer and `BottomNav` are covered;
  **everything that renders React, runs a server action, or touches the database is
  still at 0%** — pages/routes, `actions.ts` server actions, `src/lib/data/*`,
  `src/lib/supabase/*`, and the remaining components. See the two testing follow-ups in
  [roadmap.md](./roadmap.md#testing-follow-ups).

### Tweaks — flow & stats polish ✅ (non-milestone)

A small batch of real-usage refinements (branch `fsamuels/tweaks-2`); no schema or
data-model changes.

- **Start form pre-selects the creator.** `/games/new` now default-selects the player
  linked to the signed-in user (`getCurrentUserPlayerId` — `players.auth_user_id =
auth.uid()` in the current group), merged with any "Play again" roster. So the person
  logging the game no longer has to add themselves.
- **Finishing a game lands Home.** `finishGameAction` now redirects to `/` (was
  `/games`).
- **Back-link cleanup.** Removed the per-page **"← Home"** links from every screen
  (group, switch, players, account, games, new game, finish, stats) — the bottom tab
  bar already covers Home.
- **Stats reordering.** Group-stats page now shows **Trump suit frequency above** the
  players leaderboard. The home **Group stats** card was reordered to **most durak →
  games played / avg time → top suit**, and a new **top suit** tile was added (backed by
  a `topTrumpSuit` helper in `lib/validation/stats.ts`).
- **Verified:** `pnpm lint` / `build` / `test` clean; new/changed files pass
  `prettier --check`.

### Group management rework ✅ (non-milestone)

A focused pass on the Manage group flow (branch `group-management`); no schema or
data-model changes. Resolves the "clean up & improve group management" backlog item.

- **Switching moved back onto `/group`.** The dedicated `/group/switch` page was
  removed; its tap-to-switch list now lives inline at the top of the Manage group page
  via a reusable `src/components/group-switcher.tsx` (still posts to the `switchGroup`
  server action). The header (hamburger) menu's standalone **Switch group** entry was
  dropped — **Manage group** is the single entry point.
- **Manage group page hierarchy.** Top-to-bottom: a **group-details** card, then
  **Switch group**, then **Players** (Manage players link), then a top-level **Create
  group** heading + form — so switching, managing, and creating read as distinct steps
  instead of a flat stack of buttons.
- **Group-details card.** A new `getGroupDetails` helper
  ([src/lib/data/groups.ts](../src/lib/data/groups.ts)) returns the active group's
  owner (the creator's player display name, resolved via `players.auth_user_id =
groups.created_by`), creation date, timezone, and RLS-scoped member / player / game
  counts; `src/components/group-details.tsx` renders them. A `formatDateInTz` helper was
  added to `lib/time.ts` for the date-only label.
- **Tests:** `group-details.test.tsx` (facts, pluralized counts, owner/viewer states),
  `nav-menu.test.tsx` (Manage group present, Switch group gone), and `formatDateInTz`
  cases in `time.test.ts`.
- **Verified:** `pnpm lint` / `build` / `test` clean; new/changed files pass
  `prettier --check`.

### Profile pictures ✅ (non-milestone)

Authenticated players' OAuth profile pictures now appear next to their names across
the app (branch `claude/user-profile-pictures-om0zg6`).

- **`group_player_avatars(group_id)` RPC** (`20260620000000_group_player_avatars.sql`).
  A **`SECURITY DEFINER`** SQL function (it must read `auth.users`, unreadable by the
  `authenticated` role) returning only `(player_id, avatar_url)` and gated to group
  members via `is_group_member` in the `WHERE` — so a regular member page can show
  avatars without the service-role key, and no identity data beyond the picture URL
  leaks. Pictures come from `raw_user_meta_data` (`avatar_url`, falling back to
  `picture`). Backed by a `getGroupAvatars` helper (`src/lib/data/avatars.ts`) that
  returns a `Map<player_id, url>`.
- **`Avatar` component** (`src/components/avatar.tsx`) — circular picture with an
  initials fallback for guests / pictureless members; a plain `<img>`
  (`referrerPolicy="no-referrer"`) rather than `next/image` to avoid per-provider
  `remotePatterns` config.
- **Shown on:** the **players** list, the home **"most durak"** card, **everywhere** on
  the **group-stats** page (last durak, most durak, leaderboard), and the **admin**
  accounts list. **Intentionally not** on the home **🤡 last-durak** card or the
  **game-history** rows (kept uncluttered). The admin list reads pictures from the Auth
  Admin API `identity_data` via the same `pickAvatarUrl` extractor (`avatarUrl` added to
  `ExternalAccount`).
- **Tests:** `avatar.test.tsx` (picture vs. initials fallback, decorative alt /
  no-referrer, name parsing) and `avatars.test.ts` (`pickAvatarUrl` precedence/guards
  and `getGroupAvatars` row→map mapping). **111 tests passing.**
- **Verified:** `pnpm lint` / `format:check` / `test` / `build` clean. **Manual step
  (owner):** apply the migration via `supabase db push` (the function reads `auth.users`,
  so it can't run under the anon path) — pending until the branch merges.

### Stats charts — phase 1 ✅ (non-milestone)

Four Recharts v3 visualisations added to the stats pages (branch `stats-charts`).
No schema or data-model changes — all charts consume existing RPC data.

- **Trump suit donut** (`src/components/charts/trump-donut.tsx`) — replaces the
  plain text list on `/stats`. Recharts `PieChart` donut with aurora palette
  (hearts=pink, diamonds=violet, clubs=teal, spades=blue); center label shows
  total games with a recorded trump; interactive hover tooltip.
- **Durak rate bar** (`src/components/charts/durak-rate-bar.tsx`) — horizontal
  `BarChart` (layout="vertical") inserted above the player leaderboard on `/stats`,
  showing each player's durak rate as a pink bar with a right-aligned % label.
  Players truncated to 11 chars; full name + game count in the hover tooltip.
- **Head-to-head stacked bar** (`src/components/charts/head-to-head-chart.tsx`) —
  100%-normalised stacked `BarChart` on `/stats/players/[id]`, replacing the
  per-opponent text list. Pink = this player's durak share, blue = opponent's,
  transparent grey = games where neither was durak. Tooltip shows raw counts.
- **Recent form sparkline** (`src/components/charts/recent-form-sparkline.tsx`) —
  72px `AreaChart` above the chip strip on `/stats/players/[id]`. Displays the
  last 10 games oldest→newest; Y axis 0 (first out) → 1 (durak); dots coloured
  by result; pink-to-teal gradient fill; dashed 0.5 reference line.
- **Verified:** `pnpm build` / `test` (120 tests) clean.

## Not yet implemented

- **Vitest is now in use** (see the test-suite entry above); **Playwright** e2e is still
  not installed. (**next-pwa** was evaluated in M11 and rejected —
  Turbopack-incompatible; a hand-written service worker is used instead.)
- Roadmap features (M13+): offline write queue, cross-group aggregates,
  games-over-time chart, durak-rate trend line (both need a new time-series RPC).

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

- [x] ~~**Clean up & improve group management.**~~ Done — see the **Group management
      rework** section above. The standalone `/group/switch` page was folded back into a
      single Manage group page (group-details card → switch → players → create), and the
      header menu's duplicate Switch group entry was removed.
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
