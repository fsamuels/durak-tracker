# Current Status

Living snapshot of what's built. Last updated: 2026-06-16.

- **Live app:** https://durak-tracker.vercel.app
- **Repo:** https://github.com/fsamuels/durak-tracker
- **Current milestone:** M3 — Auth (Google working end to end; Facebook deferred)

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

## In progress

### Milestone 3 — Auth (on branch `milestone3`)

Built and **tested end to end with Google** (login → onboarding → create group →
protected home):

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

Remaining for M3:

- [ ] **Facebook** — deferred; re-enable provider in Supabase and restore the button
      in `src/app/login/page.tsx` once we revisit (see [oauth-setup.md](./oauth-setup.md)).
- [ ] Polish auth UX (see "Action required" → auth text/branding).

## Not yet implemented

- App screens: log a game, game history, group stats, player stats.
- Libraries planned but not installed: **Zod**, **React Hook Form**, **next-pwa**,
  **Vitest/Playwright**.
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
