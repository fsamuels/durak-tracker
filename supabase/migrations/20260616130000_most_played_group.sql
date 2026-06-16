-- Durak Tracker — most_played_group RPC (milestone 7)
-- The home page defaults the active group to the one the signed-in user has
-- played the most games in (the `durak_group_id` cookie still wins when set).
-- Replaces the earliest-created fallback in getCurrentGroup().
--
-- Counts the caller's game participations per group: game_players rows for the
-- player linked to this account (players.auth_user_id = auth.uid()), grouped by
-- the player's group. A LEFT JOIN over every member group means a user with no
-- games still resolves to a group — tie-break (and zero-games default) is the
-- earliest-created group.
--
-- SECURITY INVOKER (like log_game / group_stats): runs as the caller, so RLS
-- still scopes every row — only the user's own groups/players/games are visible.
-- Marked STABLE — read-only within a statement.
create or replace function most_played_group()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select g.id
  from groups g
  left join (
    select pl.group_id, count(*) as games_played
    from game_players gp
    join players pl on pl.id = gp.player_id
    where pl.auth_user_id = auth.uid()
    group by pl.group_id
  ) c on c.group_id = g.id
  order by coalesce(c.games_played, 0) desc, g.created_at asc, g.id asc
  limit 1;
$$;

grant execute on function most_played_group() to authenticated;
