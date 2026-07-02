-- Durak Tracker — system-wide stats for the /admin overview.
-- The admin area shows account-authority views that sit above any single
-- group's RLS scope, so — like admin_list_external_accounts and
-- admin_list_player_claims — these aggregates cross RLS via a SECURITY DEFINER
-- function granted to the service role only. It returns exactly one row of
-- scalar counts (the outer SELECT has no FROM, so it always yields one row even
-- when the system is empty; the top-group scalar subqueries read NULL then).
CREATE OR REPLACE FUNCTION public.admin_system_stats()
RETURNS TABLE (
  total_groups     int,
  total_users      int,
  total_players    int,
  guest_players    int,
  total_games      int,
  completed_games  int,
  games_7d         int,
  games_30d        int,
  new_users_7d     int,
  active_groups_7d int,
  top_group_name   text,
  top_group_games  int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    (SELECT count(*) FROM groups)::int,
    (SELECT count(*) FROM auth.users)::int,
    (SELECT count(*) FROM players)::int,
    (SELECT count(*) FROM players WHERE auth_user_id IS NULL)::int,
    (SELECT count(*) FROM games)::int,
    (SELECT count(*) FROM games WHERE ended_at IS NOT NULL)::int,
    (SELECT count(*) FROM games
       WHERE ended_at IS NOT NULL
         AND started_at >= now() - interval '7 days')::int,
    (SELECT count(*) FROM games
       WHERE ended_at IS NOT NULL
         AND started_at >= now() - interval '30 days')::int,
    (SELECT count(*) FROM auth.users
       WHERE created_at >= now() - interval '7 days')::int,
    (SELECT count(DISTINCT group_id) FROM games
       WHERE ended_at IS NOT NULL
         AND started_at >= now() - interval '7 days')::int,
    (SELECT g.name
       FROM groups g
       LEFT JOIN games ga ON ga.group_id = g.id AND ga.ended_at IS NOT NULL
       GROUP BY g.id, g.name
       ORDER BY count(ga.id) DESC, g.created_at ASC
       LIMIT 1),
    (SELECT count(ga.id)::int
       FROM groups g
       LEFT JOIN games ga ON ga.group_id = g.id AND ga.ended_at IS NOT NULL
       GROUP BY g.id, g.name
       ORDER BY count(ga.id) DESC, g.created_at ASC
       LIMIT 1)
$$;

-- Restrict to service_role only — anon/authenticated cannot call this.
REVOKE ALL ON FUNCTION public.admin_system_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_system_stats() TO service_role;
