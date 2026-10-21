# Durak Tracker

Mobile-first PWA for tracking results of [Durak](https://en.wikipedia.org/wiki/Durak)
card games among groups of friends — who was "the durak" (loser) each game, the
trump suit, players involved, and computed stats per group and per player.

### 🃏 [Try Durak Tracker →](https://durak-tracker.vercel.app)

Free, no ads, installable on your phone.

- **Status:** Milestones 1–12 complete (scaffold, schema, auth, core flow, history,
  stats, home/nav revamp, two-part logging, start-from-existing, account claiming,
  PWA + mobile design pass, account management + Facebook/Discord login); M13
  (Iterate) is ongoing, with edit/delete games, stats charts, an operator admin area,
  and an About page already shipped — see
  [docs/current-status.md](docs/current-status.md).

## Documentation

| Doc                                                          | Contents                                                       | Changes                 |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------- |
| [durak-tracker-spec.md](durak-tracker-spec.md)               | Product spec — goals, non-goals, screens, metric definitions   | Rarely                  |
| [docs/architecture.md](docs/architecture.md)                 | System design, data model, RLS, integrity, dev workflow        | With schema/RLS changes |
| [docs/current-status.md](docs/current-status.md)             | What's built, in progress, and pending                         | Every merged PR         |
| [docs/roadmap.md](docs/roadmap.md)                           | Remaining milestones, backlog, open questions                  | Occasionally            |
| [docs/oauth-setup.md](docs/oauth-setup.md)                   | Google/Facebook/Discord social-login setup steps               | Rarely                  |
| [docs/admin.md](docs/admin.md)                               | Operator-only `/admin` area and the service-role model         | With admin changes      |
| [docs/game-timing-accuracy.md](docs/game-timing-accuracy.md) | Open discussion: unreliable game durations                     | If the question moves   |
| [docs/decisions.md](docs/decisions.md)                       | Log of non-obvious decisions, with rationale and reversibility | As decisions are made   |

## Tech stack

**In use:** Next.js (App Router) + TypeScript, Tailwind CSS v4 (aurora theme tokens),
Supabase (Postgres 17, RLS) + Supabase Auth (Google, Facebook, Discord), Zod,
React Hook Form, Recharts, `next-themes`, installable PWA (Web App Manifest + a hand-written service worker — `next-pwa` was
dropped as Turbopack-incompatible), Vercel (auto-deploy), pnpm, ESLint + Prettier.

**Planned:** Playwright e2e. Vitest unit/component tests are in use. See the
[architecture stack table](docs/architecture.md#tech-stack).

## Prerequisites

- **Node 22+** and **pnpm** (`corepack enable pnpm`)
- For database work: the **Supabase CLI** (`brew install supabase/tap/supabase`) and
  **psql** (`brew install libpq`)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the Supabase values
pnpm dev                     # http://localhost:3000
```

`pnpm install` also wires up a **Husky pre-commit hook** (via the `prepare` script) that runs
Prettier on staged files, so formatting issues get fixed before they're ever committed — CI's
`format:check` is still the hard backstop if the hook is bypassed.

### Environment

Copy `.env.example` to `.env.local` (gitignored) and fill in:

| Var                             | Used by                              |
| ------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | App (client + server)                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App (client)                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only admin calls — **secret** |
| `SUPABASE_DB_PASSWORD`          | CLI / migrations only                |

Get the keys from Supabase → Project Settings → API Keys.

## Scripts

| Script                              | Does                                |
| ----------------------------------- | ----------------------------------- |
| `pnpm dev`                          | Start the dev server (Turbopack)    |
| `pnpm build`                        | Coverage run, then production build |
| `pnpm start`                        | Serve the production build          |
| `pnpm lint`                         | ESLint                              |
| `pnpm test` / `pnpm test:watch`     | Vitest unit tests (run / watch)     |
| `pnpm format` / `pnpm format:check` | Prettier write / check              |
| `pnpm test:coverage`                | Vitest with v8 coverage report      |
| `pnpm check:links`                  | Check relative links in markdown    |

## Testing

**Unit/component:** [Vitest](https://vitest.dev) — pure logic (`src/lib/**`) runs in
a Node env, components (`*.test.tsx`) in jsdom with React Testing Library. Run:

```bash
pnpm test
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint, format check,
tests (with coverage), and build on every push and PR; a separate
[Docs workflow](.github/workflows/docs.yml) checks markdown links. **Playwright e2e is still planned** — see the
[roadmap](docs/roadmap.md).

Database invariants (RLS isolation, deferred integrity triggers, RPC behavior) are
tested against the live DB via JWT-simulated `psql` in a rolled-back transaction —
see the per-milestone "Verified" notes in
[docs/current-status.md](docs/current-status.md).

## Database

Schema lives in `supabase/migrations/`; sample data in `supabase/seed.sql`.

```bash
supabase login                       # one-time, uses a personal access token
supabase link --project-ref <ref>    # link to the remote project
supabase db push                     # apply migrations to the remote DB
```

Seeding (and ad-hoc SQL) runs through `psql` over the IPv4 session pooler — see
[docs/architecture.md#local-dev--database-workflow](docs/architecture.md#local-dev--database-workflow)
for the exact command and the no-Docker rationale.

## Repository structure

```
src/
  app/              # Next.js App Router routes
    page.tsx                home (recent games + group stats summary)
    login/ onboarding/      auth entry + first-group creation
    auth/                   OAuth callback + sign-out routes
    games/                  history, start (new/), finish ([id]/finish/), detail ([id]/), edit ([id]/edit/)
    stats/                  group stats + per-player stats ([playerId]/), with charts
    players/                roster management + claim-link sharing
    group/                  manage group (details, switch active group, players, create)
    claim/[token]/          public single-use guest-claim landing page
    account/                theme, display name, connected sign-in providers
    admin/                  operator-only system overview, accounts, claim links
    about/                  build info + app-wide totals (signed-in)
    privacy/ data-deletion/ public pages (required for Facebook login review)
    manifest.ts, robots.ts, sitemap.ts  # PWA manifest + crawler files
  components/        # shared UI (nav, bottom-nav, game-list, player-chip-grid, charts/, landing-page, install-prompt, sw registration)
  lib/
    supabase/         browser + server clients, middleware, generated DB types
    data/             RLS-scoped query helpers (games, groups, players, claims)
    validation/       Zod schemas (game, player, history, stats, claim, admin)
    time.ts           timezone-aware date helpers
  proxy.ts          # session refresh + route protection (middleware)
supabase/
  migrations/        # schema + RPCs (init, log_game, stats, two-part logging, roster, claims, discard, edit/delete, avatars, admin, app stats)
  seed.sql           # demo data (Test Group + Walla Walla Run Club)
public/sw.js         # hand-written service worker
public/icons/        # static PWA icons (rendered from public/icon.svg)
design/              # icon design explorations
scripts/             # markdown link checker, admin debug helper
docs/                # architecture, current-status, roadmap, admin, oauth-setup, decisions, game-timing-accuracy
```

## Deployment

Hosted on **Vercel**. Every push to `main` auto-deploys; pull requests get preview
deployments.
