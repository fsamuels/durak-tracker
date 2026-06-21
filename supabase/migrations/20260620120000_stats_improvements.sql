-- Durak Tracker — stats improvements (stats-improvements branch)
-- Extends the stat surface promised in the spec "Metrics" section:
--   1. group_stats / player_stats gain a `p_window` time-bucket param
--      (all|week|month|year), bucketed over started_at in the GROUP'S timezone
--      per docs/architecture.md#metrics, so "this week" is deterministic.
--   2. group_stats gains longest/shortest game duration and the group's
--      "biggest rivalry" (the pair sharing the most completed games).
--   3. player_stats gains `recent_form` — the player's last 10 results.
--   4. New head_to_head(group, player) RPC — per-opponent durak split.
--
-- All SECURITY INVOKER + STABLE, like the existing stats RPCs: RLS still scopes
-- every row to the caller's groups. The earlier overloads took fewer args, so a
-- defaulted new param would make calls ambiguous (the named-arg call could match
-- either overload) — DROP the old signatures first, then recreate.

drop function if exists group_stats(uuid);
drop function if exists player_stats(uuid, uuid);

-- ============================================================================
-- group_stats(p_group_id, p_window) — all-time by default; week/month/year
-- buckets cut over started_at in the group's own timezone.
-- ============================================================================

create function group_stats(p_group_id uuid, p_window text default 'all')
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with win as (
    -- Start-of-period boundary as an instant, computed in the group's timezone
    -- so the bucket edges land on local midnight regardless of viewer location.
    select case lower(coalesce(p_window, 'all'))
      when 'week'  then date_trunc('week',  now() at time zone gr.timezone) at time zone gr.timezone
      when 'month' then date_trunc('month', now() at time zone gr.timezone) at time zone gr.timezone
      when 'year'  then date_trunc('year',  now() at time zone gr.timezone) at time zone gr.timezone
      else null
    end as cutoff
    from groups gr
    where gr.id = p_group_id
  ),
  g as (
    select id, started_at, ended_at, trump_suit
    from games, win
    where group_id = p_group_id
      and status = 'completed'
      and deleted_at is null
      and (win.cutoff is null or started_at >= win.cutoff)
  ),
  per_player as (
    select
      p.id           as player_id,
      p.display_name as display_name,
      count(*)                                as games_played,
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
  ),
  -- Unordered player pairs per game (a < b), aggregated to find the duo that
  -- has shared the most completed games — the group's "biggest rivalry".
  rivalry as (
    select
      a.player_id as p1,
      b.player_id as p2,
      count(*)                            as games_together,
      count(*) filter (where a.is_durak)  as p1_durak_count,
      count(*) filter (where b.is_durak)  as p2_durak_count
    from g
    join game_players a on a.game_id = g.id
    join game_players b on b.game_id = g.id and b.player_id > a.player_id
    group by a.player_id, b.player_id
    order by games_together desc, p1, p2
    limit 1
  )
  select jsonb_build_object(
    'games_played', (select count(*) from g),
    'games_with_duration', (select count(*) from g where ended_at is not null),
    'avg_duration_seconds', (
      select avg(extract(epoch from (ended_at - started_at)))
      from g
      where ended_at is not null
    ),
    'longest_game_seconds', (
      select max(extract(epoch from (ended_at - started_at)))
      from g
      where ended_at is not null
    ),
    'shortest_game_seconds', (
      select min(extract(epoch from (ended_at - started_at)))
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
    ),
    'biggest_rivalry', (
      select jsonb_build_object(
        'player_a_id', r.p1,
        'player_a_name', pa.display_name,
        'player_a_durak_count', r.p1_durak_count,
        'player_b_id', r.p2,
        'player_b_name', pb.display_name,
        'player_b_durak_count', r.p2_durak_count,
        'games_together', r.games_together
      )
      from rivalry r
      join players pa on pa.id = r.p1
      join players pb on pb.id = r.p2
    )
  );
$$;

grant execute on function group_stats(uuid, text) to authenticated;

-- ============================================================================
-- player_stats(p_group_id, p_player_id, p_window) — counts respect the window;
-- streaks stay all-time (a career stat) and recent_form is always the last 10.
-- ============================================================================

create function player_stats(
  p_group_id  uuid,
  p_player_id uuid,
  p_window    text default 'all'
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with win as (
    select case lower(coalesce(p_window, 'all'))
      when 'week'  then date_trunc('week',  now() at time zone gr.timezone) at time zone gr.timezone
      when 'month' then date_trunc('month', now() at time zone gr.timezone) at time zone gr.timezone
      when 'year'  then date_trunc('year',  now() at time zone gr.timezone) at time zone gr.timezone
      else null
    end as cutoff
    from groups gr
    where gr.id = p_group_id
  ),
  -- All-time participated games, ordered, for streaks and recent form.
  seq as (
    select
      gp.is_durak,
      gp.is_first_out,
      gp.is_last_out,
      g.started_at,
      row_number() over (order by g.started_at, g.id) as rn
    from games g
    join game_players gp on gp.game_id = g.id and gp.player_id = p_player_id
    where g.group_id = p_group_id
      and g.status = 'completed'
      and g.deleted_at is null
  ),
  -- Windowed subset, for the headline counts.
  wseq as (
    select s.* from seq s, win where win.cutoff is null or s.started_at >= win.cutoff
  ),
  totals as (
    select
      count(*)                                as games_played,
      count(*) filter (where is_durak)        as durak_count,
      count(*) filter (where is_first_out)    as first_out_count,
      count(*) filter (where is_last_out)     as last_out_count
    from wseq
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
    ),
    'recent_form', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'result', case
            when is_durak then 'durak'
            when is_first_out then 'first_out'
            when is_last_out then 'last_out'
            else 'middle'
          end,
          'started_at', started_at
        )
        order by rn desc
      )
      from (select * from seq order by rn desc limit 10) r
    ), '[]'::jsonb)
  );
$$;

grant execute on function player_stats(uuid, uuid, text) to authenticated;

-- ============================================================================
-- head_to_head(p_group_id, p_player_id) — for each opponent the player has
-- shared a completed game with: games together + each side's durak count.
-- ============================================================================

create function head_to_head(p_group_id uuid, p_player_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with shared as (
    select
      opp.player_id as opp_id,
      me.is_durak   as me_durak,
      opp.is_durak  as opp_durak
    from game_players me
    join games g on g.id = me.game_id
      and g.group_id = p_group_id
      and g.status = 'completed'
      and g.deleted_at is null
    join game_players opp on opp.game_id = me.game_id
      and opp.player_id <> p_player_id
    where me.player_id = p_player_id
  ),
  agg as (
    select
      opp_id,
      count(*)                            as games_together,
      count(*) filter (where me_durak)    as my_durak_count,
      count(*) filter (where opp_durak)   as opponent_durak_count
    from shared
    group by opp_id
  )
  select coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'opponent_id', a.opp_id,
        'display_name', p.display_name,
        'games_together', a.games_together,
        'my_durak_count', a.my_durak_count,
        'opponent_durak_count', a.opponent_durak_count
      )
      order by a.games_together desc, p.display_name
    )
    from agg a
    join players p on p.id = a.opp_id
  ), '[]'::jsonb);
$$;

grant execute on function head_to_head(uuid, uuid) to authenticated;
