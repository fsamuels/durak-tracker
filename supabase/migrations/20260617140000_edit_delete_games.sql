-- Durak Tracker — edit and soft-delete completed games (M13 iteration)
-- Three parts:
--   1. Add deleted_at column (soft delete / audit trail)
--   2. Update group_stats + player_stats to exclude soft-deleted games
--   3. RLS policy for soft-deletes (logged_by only, completed games)
--   4. edit_completed_game RPC — update a finished game in one transaction

-- ============================================================================
-- COLUMN — soft delete
-- ============================================================================

alter table games
  add column deleted_at timestamptz;

-- Filtered index: the common hot path is "not deleted"; keeps history queries fast.
create index games_not_deleted_idx on games (group_id, started_at desc)
  where deleted_at is null;

-- ============================================================================
-- STATS RPCS — exclude soft-deleted games (re-define with deleted_at is null)
-- ============================================================================

create or replace function group_stats(p_group_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with g as (
    select id, started_at, ended_at, trump_suit
    from games
    where group_id = p_group_id
      and status = 'completed'
      and deleted_at is null
  ),
  per_player as (
    select
      p.id           as player_id,
      p.display_name as display_name,
      count(*)                              as games_played,
      count(*) filter (where gp.is_durak)     as durak_count,
      count(*) filter (where gp.is_first_out) as first_out_count,
      count(*) filter (where gp.is_last_out)  as last_out_count
    from g
    join game_players gp on gp.game_id = g.id
    join players p       on p.id = gp.player_id
    group by p.id, p.display_name
  ),
  trump as (
    select trump_suit::text as suit, count(*) as cnt
    from g
    where trump_suit is not null
    group by trump_suit
  ),
  last_game as (
    select id, started_at from g order by started_at desc, id desc limit 1
  ),
  last_durak as (
    select p.id as player_id, p.display_name, lg.started_at
    from last_game lg
    join game_players gp on gp.game_id = lg.id and gp.is_durak
    join players p       on p.id = gp.player_id
  )
  select jsonb_build_object(
    'games_played', (select count(*) from g),
    'games_with_duration', (select count(*) from g where ended_at is not null),
    'avg_duration_seconds', (
      select avg(extract(epoch from (ended_at - started_at)))
      from g
      where ended_at is not null
    ),
    'trump_frequency', coalesce((
      select jsonb_agg(
        jsonb_build_object('suit', suit, 'count', cnt)
        order by cnt desc, suit
      )
      from trump
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'player_id', player_id,
          'display_name', display_name,
          'games_played', games_played,
          'durak_count', durak_count,
          'first_out_count', first_out_count,
          'last_out_count', last_out_count
        )
        order by durak_count desc, display_name
      )
      from per_player
    ), '[]'::jsonb),
    'player_game_count', (
      select jsonb_build_object(
        'min', min(games_played),
        'max', max(games_played),
        'avg', avg(games_played)
      )
      from per_player
    ),
    'last_durak', (
      select jsonb_build_object(
        'player_id', player_id,
        'display_name', display_name,
        'started_at', started_at
      )
      from last_durak
    )
  );
$$;

create or replace function player_stats(p_group_id uuid, p_player_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with seq as (
    select
      gp.is_durak,
      gp.is_first_out,
      gp.is_last_out,
      row_number() over (order by g.started_at, g.id) as rn
    from games g
    join game_players gp on gp.game_id = g.id and gp.player_id = p_player_id
    where g.group_id = p_group_id
      and g.status = 'completed'
      and g.deleted_at is null
  ),
  totals as (
    select
      count(*)                                as games_played,
      count(*) filter (where is_durak)        as durak_count,
      count(*) filter (where is_first_out)    as first_out_count,
      count(*) filter (where is_last_out)     as last_out_count
    from seq
  ),
  durak_islands as (
    select count(*) as len
    from (
      select rn - row_number() over (order by rn) as grp
      from seq
      where is_durak
    ) t
    group by grp
  ),
  win_islands as (
    select count(*) as len
    from (
      select rn - row_number() over (order by rn) as grp
      from seq
      where is_first_out
    ) t
    group by grp
  )
  select jsonb_build_object(
    'games_played',    (select games_played    from totals),
    'durak_count',     (select durak_count     from totals),
    'first_out_count', (select first_out_count from totals),
    'last_out_count',  (select last_out_count  from totals),
    'longest_durak_streak', coalesce((select max(len) from durak_islands), 0),
    'current_durak_streak', (
      select count(*)
      from seq
      where is_durak
        and rn > coalesce((select max(rn) from seq where not is_durak), 0)
    ),
    'longest_win_streak', coalesce((select max(len) from win_islands), 0),
    'current_win_streak', (
      select count(*)
      from seq
      where is_first_out
        and rn > coalesce((select max(rn) from seq where not is_first_out), 0)
    )
  );
$$;

-- ============================================================================
-- RLS — soft delete (logged_by may set deleted_at on their completed games)
-- ============================================================================
-- The existing games_update policy (with check: logged_by = auth.uid()) already
-- covers this path, but this named policy makes the intent explicit and scopes
-- the USING clause to completed, non-deleted games only.

create policy games_soft_delete on games
  for update to authenticated
  using  (logged_by = auth.uid() and status = 'completed' and deleted_at is null)
  with check (logged_by = auth.uid() and status = 'completed');

-- ============================================================================
-- edit_completed_game — update a completed game's details + roster in one tx
-- ============================================================================
-- A wrapping RPC is needed (rather than two direct updates) so the game_players
-- reconciliation (upsert + delete) happens in the same transaction as the games
-- update. The DEFERRABLE INITIALLY DEFERRED integrity trigger then validates the
-- final state at COMMIT rather than mid-reconciliation.
--
-- SECURITY INVOKER: games_update RLS (with check: logged_by = auth.uid()) and
-- game_players_{update,delete} policies still gate every row.

create or replace function edit_completed_game(
  p_game_id      uuid,
  p_participants jsonb,
  p_started_at   timestamptz,
  p_ended_at     timestamptz,
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

  update games
  set
    started_at = p_started_at,
    ended_at   = p_ended_at,
    trump_suit = p_trump_suit,
    deck_count = p_deck_count,
    notes      = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_game_id
    and status = 'completed'
    and deleted_at is null
    and logged_by = v_uid
  returning * into v_game;

  if not found then
    raise exception 'Game % not found, already deleted, or you are not the original logger', p_game_id
      using errcode = 'no_data_found';
  end if;

  -- Reconcile roster: upsert outcomes on existing rows, add new players, drop
  -- anyone no longer in the submitted list. Mirrors finish_game's reconciliation.
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

  -- Deferred integrity (>= 3 players, exactly one durak) fires at COMMIT.
  return v_game;
end;
$$;

grant execute on function
  edit_completed_game(uuid, jsonb, timestamptz, timestamptz, trump_suit, int, text)
  to authenticated;
