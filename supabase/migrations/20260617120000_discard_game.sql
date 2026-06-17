-- ============================================================================
-- Discard (delete) an in-progress game
-- ============================================================================
-- M11: a started-but-unfinished game can be abandoned. Deleting the game row
-- cascades to its game_players (FK on delete cascade). Only in_progress games
-- are discardable — a completed game stays a roadmap edit/delete item. Mirrors
-- the existing pattern: the app mutates via a SECURITY INVOKER RPC, and RLS
-- (the new games_delete policy below) still gates the underlying delete.

-- RLS: members of a group may delete that group's in-progress games. Completed
-- games remain undeletable from the client (no policy covers them).
create policy games_delete on games
  for delete to authenticated
  using (is_group_member(group_id) and status = 'in_progress');

create or replace function discard_game(p_game_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  -- The status guard is enforced both here and by the games_delete policy.
  delete from games
  where id = p_game_id and status = 'in_progress';

  if not found then
    raise exception 'game not found or already completed'
      using errcode = 'no_data_found';
  end if;
end;
$$;
