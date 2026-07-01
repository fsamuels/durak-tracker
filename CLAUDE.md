# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Durak Tracker — a mobile-first PWA for tracking [Durak](https://en.wikipedia.org/wiki/Durak) card game
results within groups of friends (who was "the durak," trump suit, players, computed stats). Next.js
(App Router) + TypeScript frontend talking **directly** to Supabase (Postgres + Auth) with no custom API
tier — authorization lives entirely in the database via Row Level Security (RLS).

For deeper context, read in this order: [`docs/architecture.md`](docs/architecture.md) (system design, data
model, RLS, RPCs — the most important doc for backend/DB work), [`docs/admin.md`](docs/admin.md)
(admin/service-role model), [`docs/current-status.md`](docs/current-status.md) (what's built/in progress),
and [`durak-tracker-spec.md`](durak-tracker-spec.md) (product intent, metric definitions).

## Commands

```bash
pnpm install                      # install deps
pnpm dev                          # dev server (Turbopack), http://localhost:3000
pnpm build                        # production build
pnpm lint                         # ESLint (flat config)
pnpm format / pnpm format:check   # Prettier write / check
pnpm test                         # Vitest, run once
pnpm test:watch                   # Vitest, watch mode
pnpm test:coverage                # Vitest with v8 coverage
```

Run a single test file or a subset: `pnpm run test src/lib/time.test.ts` or
`pnpm run test -t "some test name"` (note: `pnpm test -- <args>` double-dashes and silently runs everything —
use `pnpm run test <args>` instead). There are two Vitest projects (see `vitest.config.ts`):
`src/lib/**/*.test.ts` runs in a Node env, every other `*.test.tsx` runs in jsdom with React Testing Library.

CI (`.github/workflows/ci.yml`) runs lint → format:check → test → build on every push/PR to `main` — run
all four locally before considering work done. `pnpm build` needs `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` set (any URL-shaped placeholder works; the build never reaches Supabase).

### Database

No Docker on this machine, so there's no local Supabase stack / `db reset` — everything targets the linked
remote project:

```bash
supabase login                                                          # one-time
supabase link --project-ref <ref>
supabase db push                                                        # apply supabase/migrations/*.sql
supabase gen types typescript --linked > src/lib/supabase/database.types.ts   # after any schema change
```

Seed/ad-hoc SQL has no CLI command — use `psql` over the **IPv4 session pooler**
(`aws-1-us-east-2.pooler.supabase.com:5432`, user `postgres.<project-ref>`), passing `PGPASSWORD` from
`.env.local` (the direct `db.<ref>.supabase.co` host is IPv6-only). Always regenerate
`database.types.ts` after a migration — it's committed and is what keeps `supabase.from(...)`/`.rpc(...)`
type-safe.

## Git workflow

- **Branch naming**: prefix every branch with what kind of change it is —
  `feature/…` (new functionality), `bugfix/…` (fixing broken behavior), `test/…`
  (test-only changes), or `docs/…` (documentation only). Pick the prefix that
  matches the task, not the tool that generated the branch.
- **Always branch from the latest `main`.** Before creating a new branch, fetch
  and branch off current `origin/main` (`git fetch origin main && git checkout -b
<prefix>/<name> origin/main`) rather than off a stale local `main` or another
  feature branch — this avoids dragging in unrelated/merged commits and keeps
  diffs reviewable.

## Architecture

**Client → Supabase directly, RLS is the authorization layer.** The browser (and server components) talk
to Supabase's PostgREST gateway with the anon key + the user's session JWT; every query runs as
`authenticated` with `auth.uid()` set, and RLS policies (scoped through `group_members`) decide what's
visible/writable. There is no bespoke API layer to add authorization to — **a missing or wrong RLS policy
is a live data leak**, so any new table or write path needs an explicit policy, not just app-layer checks.

- **Two Supabase keys, two trust levels**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to ship (low-privilege,
  RLS-gated). `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely and must only ever be constructed
  server-side (`src/lib/supabase/admin.ts`, via `createAdminClient`) — never in a Client Component, never
  with the `NEXT_PUBLIC_` prefix. Today `/admin` is the only route that uses it (see `docs/admin.md`); admin
  access is gated by the single `isAdmin` helper (`src/lib/admin.ts`, currently an email allowlist).
- **Multi-row writes go through `SECURITY INVOKER` RPCs, not chained `.insert()`/`.update()` calls.**
  Two invariants (exactly one durak per game, ≥3 players per completed game) are enforced by
  `DEFERRABLE INITIALLY DEFERRED` constraint triggers that fire at `COMMIT`. Over PostgREST, separate
  `.insert()` calls are separate transactions, so a game and its `game_players` are always written together
  inside one RPC (`start_game`/`finish_game`, or the older one-shot `log_game`) so the deferred checks see
  every row. `logged_by` is always set from `auth.uid()` inside the function, never trusted from the client.
  Follow this pattern for any new multi-row mutation.
- **A handful of RPCs are intentionally `SECURITY DEFINER`** to cross a boundary RLS can't (e.g.
  `create_group` solves the onboarding chicken-and-egg of inserting your own membership row before you're a
  member; `group_player_avatars`/`admin_list_external_accounts` read `auth.users`, which `authenticated`
  can't). Each one re-implements its own scoping in the function body (a `WHERE is_group_member(...)`, or a
  `service_role`-only grant) since RLS isn't doing that job for it — read the existing ones in
  `supabase/migrations/` as the template before adding another.
- **`players` rows are group-scoped, not global.** The same human can have a different `players` row (and a
  different `display_name`) per group, linked back via `auth_user_id`; a null `auth_user_id` means a guest.
  Renaming yourself can be scoped to one group (`src/app/group/actions.ts`) or account-wide across every
  group you're in (`src/app/account/actions.ts`) — these are two deliberately different actions, not a bug.
- **`groups.timezone` drives all time-bucketed stats** (week/month/year cutoffs use the _group's_ timezone,
  not the viewer's, so results are deterministic) — see `docs/architecture.md#metrics`.
- **Metrics are computed on read, never cached/materialized**, via `STABLE` SQL functions
  (`group_stats`, `player_stats`, `head_to_head`, `group_roster`, …) — don't introduce a cache without
  updating that convention deliberately.

### Code layout

- `src/app/**` — Next.js App Router routes; most feature areas pair a `page.tsx` (server component, data
  fetching) with an `actions.ts` (server actions — the only place Zod validation + Supabase writes happen)
  and small client components for interactive forms.
- `src/lib/data/**` — RLS-scoped read helpers shared across pages (games, groups, players, claims, avatars).
- `src/lib/validation/**` — Zod schemas, shared between client-side form validation and server action
  re-validation (never trust client validation alone).
- `src/lib/supabase/**` — browser/server Supabase clients, the admin (service-role) client, generated
  `database.types.ts` (regenerate after every migration, don't hand-edit).
- `src/proxy.ts` — middleware: session refresh + route protection (redirects unauthenticated requests to
  `/login`).
- `supabase/migrations/*.sql` — schema + RPCs + RLS policies, one file per change, applied in filename
  (timestamp) order via `supabase db push`. Read `docs/architecture.md` before writing a new one — it
  documents the reasoning behind each existing RPC/policy and the integrity-trigger design.

### Testing

Vitest covers pure logic (`src/lib/**`) and a handful of components; DB-level invariants (RLS isolation,
deferred triggers, RPC behavior) are instead verified against the live DB via JWT-simulated `psql` in a
rolled-back transaction (see the per-milestone "Verified" notes in `docs/current-status.md`) — there is no
local Postgres to run these as automated tests against. Playwright e2e is planned but not yet installed.
