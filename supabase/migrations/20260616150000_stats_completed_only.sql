-- Durak Tracker — scope stats to completed games (milestone 8)
-- Two-part logging (M8) introduced in_progress games, which have a partial roster
-- and no durak yet. Stats must count only completed games, otherwise an in-flight
-- game would skew counts, "last durak", and durations. Re-defines the M6 stats
-- functions with a `status = 'completed'` filter; everything else is unchanged.

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
    where group_id = p_group_id and status = 'completed'
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
    where g.group_id = p_group_id and g.status = 'completed'
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
