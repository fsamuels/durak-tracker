# Separate dev/test environment — design proposal

**Status:** proposal, not yet implemented. The app now has real usage, so the project
owner wants a non-production environment to stage large changes (starting with the
[offline-mode proposal](./offline-mode-proposal.md)) through, before touching prod. This
was already a tracked backlog item (`docs/roadmap.md` → "Separate Dev/test database"); this
doc fleshes it out into an actionable plan.

## Shape of the environment

- **A second, static Supabase project** (`durak-tracker-dev` or similar), not per-PR
  ephemeral branches. Long-lived, mirrors prod's schema.
- **Vercel's built-in Production / Preview environments**: Production deploys (from
  `main`) get prod Supabase credentials; Preview deploys (every other branch/PR) get dev
  Supabase credentials. This is native Vercel project config, not a code change.
- **Local dev points at the dev project** too (per owner's answer: local + CI + previews
  all use dev; prod is only touched by deliberate promotion, i.e. merging to `main`).

## Schema sync: two options considered

1. **Same migration files applied to both projects (recommended)** — `supabase/migrations/*.sql`
   stays the single source of truth, exactly as today. `supabase link --project-ref <ref>`
   - `supabase db push` targets whichever project is linked; nothing about the migration
     files themselves changes. Free, simple, and both projects stay identical by
     construction rather than by convention.
2. **Supabase native branching** — auto-provisions ephemeral Postgres per git branch and
   applies migrations automatically. Nicer DX (no manual `link`/`push` step), but it's a
   paid-tier feature with per-branch compute cost, and provisions _per PR_ rather than one
   static long-lived environment — a bigger shift than what was asked for. Worth
   revisiting later if the team outgrows a single static dev project; not the v1 choice.

Going with **option 1**.

## Seed data

`supabase/seed.sql` already seeds a "Run Club" test group (see `docs/roadmap.md`'s
current note that the group switcher is the interim workaround for not having a separate
dev DB). That seed script runs as-is against the new dev project — no changes needed.

## CI implications

This extends the roadmap's already-planned **"Automated DB migrations in CI"** item
(`docs/roadmap.md`), just split across two targets instead of one:

- **On every push to any branch**: `supabase db push` against the **dev** project, so
  Preview deploys and local dev always see current schema pre-merge.
- **On push to `main` only**: `supabase db push` against **prod**, as already planned.

Both need `SUPABASE_ACCESS_TOKEN` (shared) and a `SUPABASE_DB_PASSWORD` **per project**
as GitHub Actions secrets (e.g. `SUPABASE_DB_PASSWORD_DEV` / `SUPABASE_DB_PASSWORD_PROD`).

The existing `pnpm build` step in CI (`.github/workflows/ci.yml`) keeps using placeholder
env vars — it never reaches Supabase either way, so this doesn't change.

## Manual steps (require your dashboard access — I can't do these)

1. **Supabase**: create the new project (dashboard → New Project), note its project ref,
   URL, anon key, service role key, and DB password.
2. **Supabase**: run `supabase link --project-ref <dev-ref>` locally once, then
   `supabase db push` to apply all existing migrations to the fresh project, then
   `psql ... < supabase/seed.sql` (or however seed is currently applied) to seed it.
3. **Vercel**: add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` scoped to the **Preview** environment only, pointing at the
   dev project (Production environment keeps today's prod values unchanged).
4. **GitHub**: add the CI secrets listed above (repo → Settings → Secrets and variables →
   Actions).
5. **Local**: update your own `.env.local` to point at the dev project's credentials
   (`.env.example` documents the required keys already).

## Repo-side changes (I can do these, once the project exists)

- Add the `migrate` job(s) to `.github/workflows/ci.yml` per the CI section above.
- Update `docs/roadmap.md` to mark "Separate Dev/test database" done, with the project
  split documented.
- Update `README.md`'s env var table if the dev-vs-prod distinction needs calling out
  there.

## Relationship to the offline-mode work

Once this exists, offline-mode implementation step 1 (the migration adding `client_id`
columns and reworking `start_game`/`finish_game` signatures — see
[offline-mode-proposal.md](./offline-mode-proposal.md)) lands on the dev project first and
gets exercised there before ever touching prod.
