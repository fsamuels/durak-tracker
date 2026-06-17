-- Durak Tracker — update an in-progress game (mid-play edits)
-- finish_game (M8) is one-shot: it reconciles the roster AND flips the game to
-- completed. But a game in progress often needs corrections before it ends —
-- add a latecomer, drop a no-show, mark who went out first, fix the trump/deck.
-- update_game does exactly that reconciliation while LEAVING the game
-- in_progress (status and ended_at untouched), so it can be called repeatedly
-- as the game plays out.
--
-- SECURITY INVOKER like its siblings: RLS (games_update / game_players_*,
-- added in M8) gates every row. The deferred integrity trigger only requires
-- >= 1 player for an in_progress game, so partial outcomes (e.g. a first-out
-- but no durak yet) are valid here.

create or replace function update_game(
  p_game_id      uuid,
  p_participants jsonb,
  p_trump_suit   trump_suit default null,
  p_deck_count   int        default null,
  p_notes        text       default null
)
returns games
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  -- Details only; status stays in_progress and ended_at is left alone.
  update games
  set
    trump_suit = p_trump_suit,
    deck_count = p_deck_count,
    notes      = nullif(trim(p_notes), '')
  where id = p_game_id and status = 'in_progress'
  returning * into v_game;

  if not found then
    raise exception 'No in-progress game % to update', p_game_id
      using errcode = 'no_data_found';
  end if;

  -- Reconcile the roster: set outcomes on existing rows, add new players, drop
  -- anyone no longer present (mirrors finish_game's reconciliation).
  insert into game_players (
    game_id, player_id, is_durak, is_first_out, is_last_out
  )
  select
    v_game.id,
    (e ->> 'player_id')::uuid,
    coalesce((e ->> 'is_durak')::boolean, false),
    coalesce((e ->> 'is_first_out')::boolean, false),
    coalesce((e ->> 'is_last_out')::boolean, false)
  from jsonb_array_elements(p_participants) as e
  on conflict (game_id, player_id) do update set
    is_durak     = excluded.is_durak,
    is_first_out = excluded.is_first_out,
    is_last_out  = excluded.is_last_out;

  delete from game_players
  where game_id = v_game.id
    and player_id not in (
      select (e ->> 'player_id')::uuid
      from jsonb_array_elements(p_participants) as e
    );

  return v_game;
end;
$$;

grant execute on function
  update_game(uuid, jsonb, trump_suit, int, text)
  to authenticated;
