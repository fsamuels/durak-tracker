# Offline mode — design proposal

**Status:** proposal, not yet implemented. Captures a design discussion; written up for
review before any code lands. Nothing in this document has been built.

## Motivation

A group trip to the mountains (no cell service) surfaced that game logging is entirely
online-only today: `/games/new` and `/games/[id]/finish` are server components backed by
server actions that call Supabase directly, so with no connectivity the flow doesn't load
at all. This proposal is the "build it properly" version rather than a weekend hack — see
[Decisions](#decisions-from-discussion) for why.

## Decisions from discussion

These were settled with the project owner before drafting the architecture below:

- **No deadline pressure** — this is not a rush job for a specific trip; build the
  offline-first version properly.
- **Scope**: offline must support **logging games** and **viewing recent games** (to
  verify entries / settle arguments mid-trip). Stats and history detail pages stay
  online-only.
- **Who logs**: one designated scorekeeper per trip (a social rule, not enforced in code).
  This avoids conflict-resolution / duplicate-game design entirely for v1.
- **Timestamps must be accurate** — weekly/monthly stats bucket on `started_at` in the
  group's timezone (see `docs/architecture.md#metrics`), so sync-time timestamps would
  skew real data. This pushed the design toward client-captured timestamps with
  server-side sanity bounds, not stamping `started_at`/`ended_at` at sync time.
- **Integration**: offline becomes **how the main logging flow works** — one code path
  that syncs instantly online and queues offline — rather than a separate offline-only
  route. Bigger rewrite, but avoids a permanent second logging surface to maintain.
- **Two-step start/finish flow stays offline-capable** (not collapsed to one-shot entry),
  because tapping start/finish at the actual moments is what makes client-captured
  timestamps accurate.
- **Guests offline**: the scorekeeper must be able to add a new guest player mid-trip, not
  just log against a fixed pre-synced roster. This is the single biggest source of sync
  complexity (see below).
- **Devices are mixed** (iOS + Android) — design for the iOS floor: no Background Sync
  API, foreground-triggered sync only, and IndexedDB eviction risk unless installed to
  home screen.

## Architecture

### Core idea

The logging flow stops calling server actions directly. Every user action (start game,
finish game, add guest) writes an event to a local queue in IndexedDB, tagged with a
client-generated UUID and a client-captured timestamp. A sync engine drains the queue to
Supabase — immediately when online, on reconnect/foreground when not. There is one code
path for both states, which is why this doubles as the "do it right" version rather than
a bolt-on offline mode.

### Database changes (one migration)

- `games.client_id` and `players.client_id` — nullable, unique. Makes sync idempotent: a
  flaky connection can safely replay the queue without creating duplicate rows.
- `start_game` / `finish_game` gain `p_client_id` and explicit `p_started_at` /
  `p_ended_at` parameters with sanity bounds (not in the future; not older than some
  window; `ended_at >= started_at`), replacing today's server-side `now()` stamping for
  synced games. This also incidentally enables backdated entry as a standalone feature.
- Guest sync: a guest created offline gets a temp UUID client-side. On sync, the guest is
  created first (idempotently, via `players.client_id`), then queued games referencing the
  temp ID are remapped to the real `player_id` before their own sync. Each game still
  syncs as a single RPC call so the existing deferred integrity triggers (exactly one
  durak, ≥3 players for completed games) see the whole transaction atomically, per the
  existing RPC pattern in `docs/architecture.md`.
- The defense-in-depth check currently in `src/app/games/new/actions.ts` (participants
  must belong to this group) moves into the RPC body — the client no longer has a trusted
  server action in front of it for this flow, so SQL becomes the sole authority instead of
  a second line of defense.

### Client changes

- Rebuild `/games/new` and `/games/[id]/finish` as client components over a local store:
  roster snapshot, in-progress games, the pending write queue, and a recent-games snapshot
  all live in IndexedDB, refreshed whenever the app is online.
- The recent-games list merges the synced snapshot with the local queue, badging unsynced
  entries ("pending sync") and surfacing sync failures with a retry — nothing is silently
  dropped.
- `public/sw.js` currently only cache-firsts static chunks/icons (see
  `docs/architecture.md#pwa--app-shell-m11`); it needs to also cache HTML navigations with
  an offline-shell fallback, since today an offline cold load just hits a browser error
  page.
- The `src/proxy.ts` matcher (already exempts `sw.js`/manifest/icons from the auth
  redirect) needs the logging routes added to that exemption list, so an expired access
  token while offline doesn't force a `/login` redirect the user can't complete.
- Sync triggers on the `online` event and app-foreground (not the Background Sync API,
  per the iOS constraint). On reconnect, supabase-js refreshes the session via the
  long-lived refresh token before sync proceeds, so writes still run under normal RLS as
  `authenticated`.
- Call `navigator.storage.persist()` and prompt the scorekeeper to install to home screen,
  since iOS Safari evicts IndexedDB for non-installed PWAs under storage pressure.

### Known edge cases / accepted limitations

- A game started online by someone else, that the offline scorekeeper later needs to
  finish: the local mirror only reflects the last synced snapshot before going offline.
  Not handled in v1 — accepted as a limitation given the one-scorekeeper assumption.
- Scorekeeper's device clock being wrong: the server-side sanity bounds on
  `p_started_at`/`p_ended_at` catch egregious cases, not subtle ones.
- Two guests with the same name created in different groups/trips: not a conflict —
  `players` rows are already group-scoped, not global (per
  `docs/architecture.md`).

### What deliberately doesn't change

Stats pages, history detail pages, and group/player management stay server components,
online-only. Metrics stay computed-on-read in SQL (`group_stats`, `player_stats`, etc.) —
no caching/materialization introduced. RLS remains the sole authorization layer; the
client-side checks removed from the deleted server action are UX-only, not a security
boundary.

## Proposed sequencing

Each step is intended to be independently reviewable and shippable:

1. **Migration + RPC changes** — client IDs, explicit timestamps with sanity bounds, guest
   sync support, defense-in-depth checks moved into SQL. Verified against the live DB via
   JWT-simulated `psql` per the project's existing convention. Useful immediately on its
   own as backdated game entry, independent of everything below.
2. **Local store + sync engine** — pure TypeScript in `src/lib/`, covered by Vitest (this
   is the most test-worthy logic in the feature).
3. **Rebuild the logging flow** on top of the store, matching current online behavior
   before adding offline UI.
4. **Service worker + middleware** — HTML document caching, offline shell fallback,
   logging-route auth exemption, foreground/online sync triggers.
5. **Offline recent-games list + sync-status UI** (pending/failed/retry badges).
6. **Docs**: amend `docs/architecture.md`'s "writes go through server actions" convention
   to note this flow's exception, update `docs/current-status.md` and
   `docs/roadmap.md` once shipped.

## Open dependency: separate dev environment

The project owner has flagged that the app is now in real use, and wants a separate
dev/test Supabase project (already tracked as a backlog item — see
`docs/roadmap.md`'s "Separate Dev/test database" entry) set up **before** starting on the
offline-mode work above, given its size (new tables, RPC signature changes, a rewritten
logging flow). That environment's own design (hosting, secrets, CI wiring) is being
scoped separately and is a prerequisite for starting implementation step 1.
