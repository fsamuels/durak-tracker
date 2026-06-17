# Durak Tracker

Mobile-first PWA for tracking results of [Durak](https://en.wikipedia.org/wiki/Durak)
card games among groups of friends — who was "the durak" (loser) each game, the
trump suit, players involved, and computed stats per group and per player.

- **Live:** https://durak-tracker.vercel.app
- **Status:** Milestones 1–11 complete (scaffold, schema, auth, core flow, history,
  stats, home/nav revamp, two-part logging, start-from-existing, account claiming,
  PWA + mobile design pass); M12 (Iterate) is next — see
  [docs/current-status.md](docs/current-status.md).

## Documentation

| Doc                                              | Contents                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [durak-tracker-spec.md](durak-tracker-spec.md)   | Product spec — goals, non-goals, screens, metric definitions |
| [docs/architecture.md](docs/architecture.md)     | System design, data model, RLS, integrity, dev workflow      |
| [docs/current-status.md](docs/current-status.md) | What's built, in progress, and pending                       |
| [docs/roadmap.md](docs/roadmap.md)               | Remaining milestones, backlog, open questions                |
| [docs/oauth-setup.md](docs/oauth-setup.md)       | Google/Facebook social-login setup steps                     |

## Tech stack

**In use:** Next.js (App Router) + TypeScript, Tailwind CSS v4 (aurora theme tokens),
Supabase (Postgres 17, RLS) + Supabase Auth (Google), Zod, React Hook Form,
installable PWA (Web App Manifest + a hand-written service worker — `next-pwa` was
dropped as Turbopack-incompatible), Vercel (auto-deploy), pnpm, ESLint + Prettier.

**Planned:** Facebook + Discord login (deferred — see
[docs/oauth-setup.md](docs/oauth-setup.md)), Vitest/Playwright. See the
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

| Script                              | Does                             |
| ----------------------------------- | -------------------------------- |
| `pnpm dev`                          | Start the dev server (Turbopack) |
| `pnpm build`                        | Production build                 |
| `pnpm start`                        | Serve the production build       |
| `pnpm lint`                         | ESLint                           |
| `pnpm format` / `pnpm format:check` | Prettier write / check           |

## Testing

No automated test suite yet (**Vitest/Playwright** are planned — see the
[roadmap](docs/roadmap.md)). Until then, changes are verified with:

```bash
pnpm lint && pnpm build && pnpm format:check
```

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
    games/                  start (new/) and finish ([id]/finish/) flows + history
    stats/                  group stats + per-player stats ([playerId]/)
    players/                roster management + claim-link sharing
    group/                  manage group + switch active group
    claim/[token]/          public single-use guest-claim landing page
    account/                signed-in account stub
    manifest.ts, icon.tsx, apple-icon.tsx, icons/[size]/  # PWA manifest + generated icons
  components/        # shared UI (nav, bottom-nav, game-list, forms, install-prompt, sw registration)
  lib/
    supabase/         browser + server clients, middleware, generated DB types
    data/             RLS-scoped query helpers (games, groups, players, claims)
    validation/       Zod schemas (game, player, history, stats, claim)
    time.ts           timezone-aware date helpers
  proxy.ts          # session refresh + route protection (middleware)
supabase/
  migrations/        # schema + RPCs (init, log_game, stats, two-part logging, roster, claims, discard)
  seed.sql           # demo data (Walla Walla Run Club, 36 games)
public/sw.js         # hand-written service worker
docs/                # architecture, current-status, roadmap, oauth-setup
```

## Deployment

Hosted on **Vercel**. Every push to `main` auto-deploys; pull requests get preview
deployments.
