-- Durak Tracker — account claiming (milestone 10)
-- A group member shares a single-use link that ties a guest player
-- (auth_user_id IS NULL) to the real person's account. This folds the backlog
-- "group invitations" + "guest player claiming" items into one flow: claiming a
-- player both links the account AND makes the claimer a group member.
--
-- Design (mirrors the existing RPC patterns):
--   create_player_claim  — SECURITY INVOKER: a member mints a link; RLS gates the
--                          player/group rows it touches.
--   claim_details        — SECURITY DEFINER: the landing page must show who/what
--                          is being claimed before the claimer is a member (RLS
--                          would otherwise hide the group + player).
--   claim_player         — SECURITY DEFINER: the claimer isn't a member yet, so
--                          it must insert group_members + update the player past
--                          RLS. All-or-nothing in one transaction.

-- ============================================================================
-- TABLE
-- ============================================================================

create table player_claims (
  token      uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id) on delete cascade,
  player_id  uuid not null references players (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  -- Single-use, active for 7 days (roadmap M10). Stored as an absolute instant
  -- so the link's lifetime doesn't drift with server clock interpretation.
  expires_at timestamptz not null default now() + interval '7 days',
  -- Null until redeemed; together these mark the link "used" (single-use).
  claimed_by uuid references auth.users (id),
  claimed_at timestamptz
);

create index player_claims_player_id_idx on player_claims (player_id);
create index player_claims_group_id_idx on player_claims (group_id);

-- ============================================================================
-- CONSTRAINT — one account per person per group
-- ============================================================================
-- Claiming sets players.auth_user_id and adds a group_members row; a person must
-- map to exactly one player in a group. This partial unique index is the
-- edge-case guard the claim flow relies on (a second claim by the same user in
-- the same group fails here). Guests (auth_user_id IS NULL) are unconstrained.
create unique index players_one_account_per_group
  on players (group_id, auth_user_id) where auth_user_id is not null;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Members can mint and review claim links for their own groups. The redemption
-- lifecycle (reading a foreign claim, marking it used) goes through the
-- SECURITY DEFINER RPCs below, so there is no client update/delete policy.
alter table player_claims enable row level security;

create policy player_claims_select on player_claims
  for select to authenticated
  using (is_group_member(group_id));

create policy player_claims_insert on player_claims
  for insert to authenticated
  with check (is_group_member(group_id) and created_by = auth.uid());

-- ============================================================================
-- create_player_claim — a member mints a single-use link for a guest player
-- ============================================================================
-- SECURITY INVOKER: RLS confirms the caller can see the player (i.e. is a member
-- of its group). We additionally require the player to still be a guest, since
-- there is nothing to claim once it is linked to an account.
create or replace function create_player_claim(p_player_id uuid)
returns player_claims
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_player players;
  v_claim  player_claims;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  -- RLS scopes this select to the caller's groups; not-found means either the
  -- player does not exist or the caller is not a member of its group.
  select * into v_player from players where id = p_player_id;
  if not found then
    raise exception 'Player % not found', p_player_id
      using errcode = 'no_data_found';
  end if;

  if v_player.auth_user_id is not null then
    raise exception 'Player % is already linked to an account', p_player_id
      using errcode = 'check_violation';
  end if;

  insert into player_claims (group_id, player_id, created_by)
  values (v_player.group_id, p_player_id, v_uid)
  returning * into v_claim;

  return v_claim;
end;
$$;

-- ============================================================================
-- claim_details — describe a claim for the landing page (status + names)
-- ============================================================================
-- SECURITY DEFINER: the claimer is typically not a member yet, so RLS would hide
-- the group and player. Returns enough to render /claim/[token] without exposing
-- anything sensitive: the group + player names and a coarse status. Read-only.
create or replace function claim_details(p_token uuid)
returns table (
  status       text,
  group_name   text,
  player_name  text,
  already_member boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_claim  player_claims;
  v_group  groups;
  v_player players;
  v_status text;
begin
  select * into v_claim from player_claims where token = p_token;
  if not found then
    return query select 'not_found'::text, null::text, null::text, false;
    return;
  end if;

  select * into v_group from groups where id = v_claim.group_id;
  select * into v_player from players where id = v_claim.player_id;

  if v_claim.claimed_at is not null then
    v_status := 'claimed';
  elsif v_claim.expires_at < now() then
    v_status := 'expired';
  elsif v_player.auth_user_id is not null then
    -- Player linked some other way after the link was minted.
    v_status := 'claimed';
  else
    v_status := 'valid';
  end if;

  return query
    select
      v_status,
      v_group.name,
      v_player.display_name,
      v_uid is not null and exists (
        select 1 from group_members
        where group_id = v_claim.group_id and user_id = v_uid
      );
end;
$$;

-- ============================================================================
-- claim_player — redeem a link: link the player + join the group (single-use)
-- ============================================================================
-- SECURITY DEFINER: the caller is not a member of the group yet, so this must
-- write group_members and players past RLS. Everything happens in one
-- transaction: validate the token, link the player to the account, add the
-- membership, and stamp the claim used. Any raise rolls the whole thing back.
create or replace function claim_player(p_token uuid)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_claim  player_claims;
  v_player players;
  v_group  groups;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  -- Lock the claim row so two concurrent redemptions can't both succeed.
  select * into v_claim from player_claims where token = p_token for update;
  if not found then
    raise exception 'Claim link not found' using errcode = 'no_data_found';
  end if;

  if v_claim.claimed_at is not null then
    raise exception 'This link has already been used'
      using errcode = 'check_violation';
  end if;

  if v_claim.expires_at < now() then
    raise exception 'This link has expired' using errcode = 'check_violation';
  end if;

  select * into v_player from players where id = v_claim.player_id for update;
  if not found then
    raise exception 'Player no longer exists' using errcode = 'no_data_found';
  end if;

  if v_player.auth_user_id is not null then
    raise exception 'This player has already been claimed'
      using errcode = 'check_violation';
  end if;

  -- One account per person per group: if the claimer already maps to a player in
  -- this group, claiming a second one would violate players_one_account_per_group.
  -- Fail with a clear message instead of a raw unique-violation.
  if exists (
    select 1 from players
    where group_id = v_claim.group_id and auth_user_id = v_uid
  ) then
    raise exception 'You already have a player in this group'
      using errcode = 'unique_violation';
  end if;

  update players set auth_user_id = v_uid where id = v_player.id;

  -- Make the claimer a member (idempotent — they shouldn't be one yet, but a
  -- prior partial state shouldn't block redemption).
  insert into group_members (group_id, user_id, role)
  values (v_claim.group_id, v_uid, 'member')
  on conflict (group_id, user_id) do nothing;

  update player_claims
  set claimed_by = v_uid, claimed_at = now()
  where token = p_token;

  select * into v_group from groups where id = v_claim.group_id;
  return v_group;
end;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

grant select, insert on player_claims to authenticated;
grant execute on function create_player_claim(uuid) to authenticated;
grant execute on function claim_details(uuid) to authenticated, anon;
grant execute on function claim_player(uuid) to authenticated;
