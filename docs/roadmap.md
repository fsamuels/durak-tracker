# Roadmap

Milestones 1–6 are complete; M7 (PWA polish) is next (see
[current-status.md](./current-status.md)). A milestone's PR carries the docs marking
it complete — outstanding manual testing is done before that PR merges. M3 shipped **Google** auth only —
Facebook was deferred to the backlog below. Product intent and non-goals live in
the [spec](../durak-tracker-spec.md).

## Remaining milestones (v1)

4. **Core flow** _(done)_ — add players (incl. guests); log a game; persist to
   DB. Introduced Zod + React Hook Form, with min-3-players / exactly-one-durak
   validated client-side and re-checked server-side via the `log_game` RPC.
5. **Game history** _(done)_ — list games per group, most-recent first, with
   a date-range filter scoped to the group's timezone.
6. **Stats v1** _(done)_ — group stats and player stats pages computing the
   spec metrics at all-time, in-group granularity via two `SECURITY INVOKER` RPCs
   (`group_stats` / `player_stats`). Deferred to later milestones: time-span buckets
   (week/month/year), cross-group account-level aggregates, head-to-head, and
   charts (see below).
7. **PWA polish** _(next)_ — manifest, icons, install prompt, offline static-asset
   caching (introduces `next-pwa`).
8. **Iterate** — additional metrics, claiming flow, invite system, refinements from
   real usage.

## Deferred from M6 (stats follow-ups)

- **Time-span buckets** — durak counts and "most durak" per week/month/year, bucketed
  over `started_at` in the group's timezone (the architecture rule is already
  documented; only the UI + queries remain).
- **Cross-group / account-level aggregates** — the spec's per-player cross-group
  stats, for registered players joined via `auth_user_id`.
- **Head-to-head** — each player's durak % against another; still an open question
  below (profile-only vs a dedicated comparison screen).
- **Charts / visualizations** — v1 ships simple numbers only.
- **`round_count`** — the per-game metric isn't captured at log time yet.

## Post-v1 backlog

- **Facebook login** — enable the Facebook provider in Supabase and restore the button
  in `src/app/login/page.tsx` (deferred from M3; see [oauth-setup.md](./oauth-setup.md)).
- **Auth UX polish** — Supabase custom auth domain + Google consent-screen branding so
  the login flow doesn't surface the raw Supabase project domain.
- **Edit/delete game** — scoped to `logged_by` or group owner; soft-delete preferred;
  audit trail.
- **Group invitations** — owner generates an invite link/code; invitee authenticates
  and joins; invite expires after N days or N uses.
- **Guest player claiming** — UI for an authenticated user to claim a guest `players`
  row in their group (schema already supports it: set `auth_user_id`, history carries
  forward).
- **Offline support** — service worker queues writes locally, syncs on reconnect.
- **Multi-player game confirmation** — multiple players confirm/enter one game;
  conflict resolution TBD.
- **Push notifications** — streak alerts, durak taunts, etc.
- **Native app** — Capacitor wrapper around the PWA for app-store distribution.
- **Separate Dev/test database** — a dedicated Supabase project (or branch) for
  testing, so the seeded **Run Club** test group lives apart from real data. Until
  then the home-page group switcher (M6) lets the owner flip between the seeded group
  and their real group on the production DB.

## Open questions / decisions for later

- **Group switching UI** — a basic cookie-backed switcher shipped in M6 (tap a group
  on the home page; `getCurrentGroup()` honors the cookie). The fuller decision —
  dropdown vs separate URLs (`/groups/[id]/...`), and where the active-group indicator
  lives app-wide — is still open.
- **`ended_at` entry** — log-time only, or a "start/stop timer" flow for real-time
  tracking in a future release?
- **Head-to-head** — surface on the player profile only, or also a dedicated
  comparison screen?

_(Resolved: `started_at` defaults to now and is editable/backdatable — v0.3.)_
