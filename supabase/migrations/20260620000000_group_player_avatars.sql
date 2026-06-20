-- Durak Tracker — group_player_avatars RPC (profile pictures)
-- Surfaces the profile picture of each *authenticated* player in a group so the
-- UI can show an avatar next to their name (players list, home "most durak",
-- group stats). Pictures come from the linked auth user's OAuth metadata —
-- Google (and other providers) store them on `auth.users.raw_user_meta_data`
-- under `avatar_url` (some providers use `picture`).
--
-- Unlike the other group RPCs (group_roster / group_stats), this one must read
-- `auth.users`, which the `authenticated` role can't select directly, so it is
-- **SECURITY DEFINER**. Access is still gated to group members via the
-- `is_group_member` guard in the WHERE clause (matching the RLS on `players`),
-- and the function returns nothing but a player id and a picture URL — never
-- emails or other identity data. Marked STABLE — read-only within a statement.
--
-- Guests (no auth_user_id) and members without a picture are simply absent from
-- the result; callers treat a missing row as "no avatar" and fall back to
-- initials.
create or replace function group_player_avatars(p_group_id uuid)
returns table (player_id uuid, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         coalesce(
           nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
           nullif(u.raw_user_meta_data ->> 'picture', '')
         ) as avatar_url
  from players p
  join auth.users u on u.id = p.auth_user_id
  where p.group_id = p_group_id
    and is_group_member(p_group_id)
    and coalesce(
          nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
          nullif(u.raw_user_meta_data ->> 'picture', '')
        ) is not null;
$$;

grant execute on function group_player_avatars(uuid) to authenticated;
