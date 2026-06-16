# Current Status

Living snapshot of what's built. Last updated: 2026-06-15.

- **Live app:** https://durak-tracker.vercel.app
- **Repo:** https://github.com/fsamuels/durak-tracker
- **Current milestone:** M3 — Auth (in progress)

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

Scaffolded (code complete, builds clean — needs credentials + OAuth config to run):

- `@supabase/ssr` + `@supabase/supabase-js`; generated DB types
  (`src/lib/supabase/database.types.ts`).
- Browser + server Supabase clients; `proxy.ts` session refresh + route protection.
- Login page (Google/Facebook OAuth); `/auth/callback` + `/auth/signout` routes.
- Onboarding page → `create_group` RPC; protected home (redirects to login /
  onboarding).

Remaining for M3:

- [ ] Configure **Google + Facebook OAuth** providers in Supabase (client id/secret
      from each console; redirect URL `…/auth/callback`).
- [ ] Add **anon** + **service_role** keys to `.env.local`, then test the flow end to end.

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
- [ ] Provide the **anon/publishable** and **service_role/secret** API keys
      (`.env.local` placeholders are empty) — needed to run M3.

## Housekeeping

- Unused default `public/*.svg` assets from create-next-app can be removed.

## Credentials & secrets

- All secrets live in **gitignored `.env.local`**; `.env.example` is the committed
  template. Supabase auth token lives in the CLI keychain, not in any file.
