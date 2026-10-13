-- Durak Tracker — app-wide stats for the About page
--
-- The About page shows a few "how big has this gotten" totals across every
-- group: groups, accounts, games, time played, trump-suit split, and so on.
-- RLS only lets a user see their own groups' rows, so — like the admin
-- aggregates in admin_system_stats() — this is a SECURITY DEFINER function.
-- Unlike that one, it's callable by any signed-in user, so it returns
-- aggregate counts only: no row data, no group or player names, no user
-- identity (admin_system_stats' top_group_name is deliberately left out).
--
-- "Games" means completed, not soft-deleted games, matching the stats RPCs.
-- The outer SELECT has no FROM, so it always yields exactly one row, even on
-- an empty database (sums coalesce to 0; first_game_at is NULL then).
--
-- Granted to `authenticated` only: /about sits behind sign-in, and the
-- account total (auth.users) isn't something to hand to anonymous callers.
-- Per 20260709000001_admin_fn_service_role_only.sql, Supabase's default
-- privileges grant EXECUTE to anon/authenticated directly, so the revoke has
-- to name those roles — FROM PUBLIC alone is not enough.

create function public.get_app_stats()
returns table (
  groups          bigint,
  accounts        bigint,
  players         bigint,
  guest_players   bigint,
  games           bigint,
  seats           bigint,
  played_seconds  bigint,
  hearts_games    bigint,
  diamonds_games  bigint,
  clubs_games     bigint,
  spades_games    bigint,
  largest_table   int,
  first_game_at   timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with done as (
    select g.id, g.started_at, g.ended_at, g.trump_suit
      from public.games g
     where g.status = 'completed'
       and g.deleted_at is null
  )
  select
    (select count(*) from public.groups),
    (select count(*) from auth.users),
    (select count(*) from public.players),
    (select count(*) from public.players where auth_user_id is null),
    (select count(*) from done),
    (select count(*) from public.game_players gp join done d on d.id = gp.game_id),
    (select coalesce(sum(extract(epoch from (ended_at - started_at)))::bigint, 0)
       from done
      where ended_at is not null),
    (select count(*) from done where trump_suit = 'hearts'),
    (select count(*) from done where trump_suit = 'diamonds'),
    (select count(*) from done where trump_suit = 'clubs'),
    (select count(*) from done where trump_suit = 'spades'),
    (select coalesce(max(n), 0)::int
       from (select count(*) as n
               from public.game_players gp
               join done d on d.id = gp.game_id
              group by gp.game_id) t),
    (select min(started_at) from done);
$$;

revoke all on function public.get_app_stats() from public, anon, authenticated;
grant execute on function public.get_app_stats() to authenticated;
