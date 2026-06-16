# Roadmap

Milestones 1–2 are complete (see [current-status.md](./current-status.md)).
Product intent and non-goals live in the [spec](../durak-tracker-spec.md).

## Remaining milestones (v1)

3. **Auth** — configure Google + Facebook OAuth in Supabase; login/logout; onboarding
   screen (create group, via the `create_group` RPC); protect all routes (redirect to
   login if unauthenticated, to onboarding if no group).
4. **Core flow** — add players (incl. guests); log a game; persist to DB. Introduces
   Zod + React Hook Form, with min-3-players / exactly-one-durak validated client-side.
5. **Game history** — list games per group, with a date-range filter.
6. **Stats v1** — group stats and player stats pages computing all defined metrics.
7. **PWA polish** — manifest, icons, install prompt, offline static-asset caching
   (introduces `next-pwa`).
8. **Iterate** — additional metrics, claiming flow, invite system, refinements from
   real usage.

## Post-v1 backlog

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

## Open questions / decisions for later

- **Group switching UI** — dropdown vs separate URLs (`/groups/[id]/...`).
- **`ended_at` entry** — log-time only, or a "start/stop timer" flow for real-time
  tracking in a future release?
- **Head-to-head** — surface on the player profile only, or also a dedicated
  comparison screen?

_(Resolved: `started_at` defaults to now and is editable/backdatable — v0.3.)_
