# Durak Tracker

Mobile-first PWA for tracking results of [Durak](https://en.wikipedia.org/wiki/Durak)
card games among groups of friends — who was "the durak" (loser) each game, the
trump suit, players involved, and computed stats per group and per player.

- **Live:** https://durak-tracker.vercel.app
- **Status:** Milestones 1–2 complete (scaffold + schema); M3 (Auth) in progress —
  see [docs/current-status.md](docs/current-status.md).

## Documentation

| Doc                                              | Contents                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [durak-tracker-spec.md](durak-tracker-spec.md)   | Product spec — goals, non-goals, screens, metric definitions |
| [docs/architecture.md](docs/architecture.md)     | System design, data model, RLS, integrity, dev workflow      |
| [docs/current-status.md](docs/current-status.md) | What's built, in progress, and pending                       |
| [docs/roadmap.md](docs/roadmap.md)               | Remaining milestones, backlog, open questions                |

## Tech stack

**In use:** Next.js (App Router) + TypeScript, Tailwind CSS v4, Supabase (Postgres,
RLS), Vercel (auto-deploy), pnpm, ESLint + Prettier.

**Planned:** Supabase Auth (Google + Facebook), Zod, React Hook Form, `next-pwa`,
Vitest/Playwright. See the [architecture stack table](docs/architecture.md#tech-stack).

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

## Deployment

Hosted on **Vercel**. Every push to `main` auto-deploys; pull requests get preview
deployments.
