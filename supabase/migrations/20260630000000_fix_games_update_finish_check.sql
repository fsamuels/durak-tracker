-- Durak Tracker — fix games_update RLS so any group member can finish a game
--
-- Bug: games_update's WITH CHECK required logged_by = auth.uid() on the
-- *resulting* row. finish_game() never writes logged_by, so the check was
-- really asserting the row's pre-existing logged_by (set by whoever ran
-- start_game) still equals the caller — i.e. only the original starter could
-- ever finish a game. InProgressGames shows the "Finish" CTA to every group
-- member, and the documented design (docs/architecture.md, M8) is that any
-- group member can finish a started game, so this silently broke that path
-- with a generic RLS error for everyone but the starter.
--
-- Fix: drop the logged_by restriction from games_update — membership is the
-- intended gate for finish_game (and edit_completed_game, which already
-- enforces its own "logged_by only" rule internally via its WHERE clause).
-- The separate games_soft_delete policy keeps its own logged_by = auth.uid()
-- check, so soft-delete is unaffected and still logger-only.

drop policy games_update on games;

create policy games_update on games
  for update to authenticated
  using (is_group_member(group_id))
  with check (is_group_member(group_id));
