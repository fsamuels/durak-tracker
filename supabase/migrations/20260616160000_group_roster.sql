-- Durak Tracker — group_roster RPC (milestone 9)
-- The start/finish flows pick players from the current group's roster. With a
-- dozen+ players, frequent players should surface first, so the picker is
-- ordered by games-played desc (then name). Name search over this list is done
-- client-side once the ranked roster is loaded.
--
-- games_played counts the player's COMPLETED games (matching the stats
-- definition; in-progress games don't count toward the ranking). Guests and
-- never-played members still appear (LEFT JOIN), with games_played = 0.
--
-- SECURITY INVOKER (like most_played_group / group_stats): runs as the caller,
-- so RLS scopes players/game_players/games to the caller's groups. Marked
-- STABLE — read-only within a statement.
create or replace function group_roster(p_group_id uuid)
returns table (id uuid, display_name text, games_played bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.display_name,
         count(*) filter (where g.status = 'completed') as games_played
  from players p
  left join game_players gp on gp.player_id = p.id
  left join games g on g.id = gp.game_id
  where p.group_id = p_group_id
  group by p.id, p.display_name
  order by count(*) filter (where g.status = 'completed') desc,
           p.display_name asc;
$$;

grant execute on function group_roster(uuid) to authenticated;
