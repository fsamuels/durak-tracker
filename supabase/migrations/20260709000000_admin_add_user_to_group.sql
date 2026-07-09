-- Durak Tracker — admin: add an existing account to a group
--
-- Operator-only counterpart to the claim flow. claim_player is consent-based
-- (the user redeems a link themselves); this RPC lets an account authority put
-- an existing auth user into a group directly — either by creating a fresh
-- player row or by linking one of the group's guest players to the account.
-- It is deliberately NOT exposed to `authenticated`: a member-facing version
-- would let any group probe the system-wide account list (see docs/admin.md).
--
-- "Adding a user to a group" is always two rows written atomically:
--   group_members — grants RLS visibility (idempotent; a prior membership
--                   without a player row shouldn't block adding the player)
--   players       — the user's identity in games, with auth_user_id set
--
-- SECURITY DEFINER because it writes past RLS on behalf of no group member;
-- scoping is the service_role-only grant (the /admin server action is the sole
-- caller, behind the isAdmin gate), mirroring admin_list_external_accounts.

create or replace function admin_add_user_to_group(
  p_user_id      uuid,
  p_group_id     uuid,
  p_display_name text default null,
  p_player_id    uuid default null
)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User % not found', p_user_id using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from groups where id = p_group_id) then
    raise exception 'Group % not found', p_group_id using errcode = 'no_data_found';
  end if;

  -- One account per person per group (same rule claim_player enforces); fail
  -- with a clear message instead of a raw players_one_account_per_group
  -- unique violation.
  if exists (
    select 1 from players
    where group_id = p_group_id and auth_user_id = p_user_id
  ) then
    raise exception 'User already has a player in this group'
      using errcode = 'unique_violation';
  end if;

  if p_player_id is not null then
    -- Link an existing guest player, mirroring claim_player's checks.
    select * into v_player from players where id = p_player_id for update;
    if not found or v_player.group_id <> p_group_id then
      raise exception 'Player % not found in group', p_player_id
        using errcode = 'no_data_found';
    end if;

    if v_player.auth_user_id is not null then
      raise exception 'Player is already linked to an account'
        using errcode = 'check_violation';
    end if;

    update players
    set auth_user_id = p_user_id, updated_at = now()
    where id = p_player_id
    returning * into v_player;
  else
    -- Create a fresh player row. players.display_name's CHECK also rejects
    -- blank names, but raise the readable error here first.
    if p_display_name is null or length(trim(p_display_name)) = 0 then
      raise exception 'Display name is required when not linking a guest'
        using errcode = 'check_violation';
    end if;

    insert into players (group_id, display_name, auth_user_id)
    values (p_group_id, trim(p_display_name), p_user_id)
    returning * into v_player;
  end if;

  insert into group_members (group_id, user_id, role)
  values (p_group_id, p_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_player;
end;
$$;

-- Restrict to service_role only — anon/authenticated cannot call this.
revoke all on function admin_add_user_to_group(uuid, uuid, text, uuid) from public;
grant execute on function admin_add_user_to_group(uuid, uuid, text, uuid) to service_role;
