# Current Status

Living snapshot of what's built. Last updated: 2026-06-15.

- **Live app:** https://durak-tracker.vercel.app
- **Repo:** https://github.com/fsamuels/durak-tracker
- **Current milestone:** M5 — Game history shipped; next up is M6 — Stats v1.

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

Deferred out of M5 (see [roadmap](./roadmap.md)): **edit/delete game**,
**per-player stats**, and **pagination** beyond the simple 100-row cap. `ended_at`
is queried but not yet surfaced in the row UI.

## Not yet implemented

- App screens: group stats, player stats.
- Libraries planned but not installed: **next-pwa**, **Vitest/Playwright**.
- PWA layer (manifest, icons, install prompt, service worker).
- Roadmap features: edit/delete game, invitations, guest claiming, offline, etc.

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
