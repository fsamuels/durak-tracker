-- Durak Tracker — log_game RPC (milestone 4)
-- Atomically insert one game and all of its game_players rows in a single
-- transaction, so the DEFERRABLE INITIALLY DEFERRED integrity triggers
-- (>= 3 players, exactly one durak) validate at COMMIT with every row present.
-- Two separate PostgREST inserts would each be their own transaction, so the
-- game would commit player-less and be rejected — hence an RPC, mirroring the
-- create_group onboarding pattern.

-- SECURITY INVOKER: runs as the caller, so RLS still gates every insert
-- (games_insert requires membership + logged_by = auth.uid(); game_players_insert
-- requires membership of the just-created game). logged_by is set from auth.uid()
-- here rather than trusted from the client.
create or replace function log_game(
  p_group_id     uuid,
  -- [{"player_id":uuid,"is_durak":bool,"is_first_out":bool,"is_last_out":bool}, ...]
  p_participants jsonb,
  p_started_at   timestamptz default now(),
  p_ended_at     timestamptz default null,
  p_trump_suit   trump_suit  default null,
  p_deck_count   int         default null,
  p_notes        text        default null
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

  insert into games (
    group_id, started_at, ended_at, trump_suit, deck_count, notes, logged_by
  )
  values (
    p_group_id,
    coalesce(p_started_at, now()),
    p_ended_at,
    p_trump_suit,
    p_deck_count,
    nullif(trim(p_notes), ''),
    v_uid
  )
  returning * into v_game;

  insert into game_players (
    game_id, player_id, is_durak, is_first_out, is_last_out
  )
  select
    v_game.id,
    (e ->> 'player_id')::uuid,
    coalesce((e ->> 'is_durak')::boolean, false),
    coalesce((e ->> 'is_first_out')::boolean, false),
    coalesce((e ->> 'is_last_out')::boolean, false)
  from jsonb_array_elements(p_participants) as e;

  -- Deferred integrity triggers (min 3 players, exactly one durak) fire at the
  -- COMMIT of the statement that called this function.
  return v_game;
end;
$$;

grant execute on function
  log_game(uuid, jsonb, timestamptz, timestamptz, trump_suit, int, text)
  to authenticated;
