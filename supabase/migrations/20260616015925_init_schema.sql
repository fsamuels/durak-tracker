-- Durak Tracker — initial schema (spec v0.3)
-- Sections: enums -> tables -> indexes -> functions -> triggers -> RLS -> grants
-- All access is scoped to a group via group_members; see RLS section.

-- ============================================================================
-- ENUMS
-- ============================================================================

create type trump_suit as enum ('hearts', 'diamonds', 'clubs', 'spades');

-- ============================================================================
-- TABLES
-- ============================================================================

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  -- IANA tz (e.g. 'America/New_York'); reference tz for time-span stat buckets.
  -- App sets this from the creator's browser; 'UTC' is a safe DB default.
  timezone    text not null default 'UTC',
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table group_members (
  group_id  uuid not null references groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Anyone who can appear in a game. Guest = auth_user_id IS NULL (no stored boolean).
create table players (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  -- null = guest; set when a guest claims their account (future).
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table games (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id) on delete cascade,
  started_at timestamptz not null default now(),       -- may be backdated
  ended_at   timestamptz,                              -- duration = ended_at - started_at
  trump_suit trump_suit,
  deck_count int check (deck_count is null or deck_count > 0),
  logged_by  uuid not null references auth.users (id),
  notes      text,
  metrics    jsonb,                                    -- flexible per-game metrics
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_ended_after_started
    check (ended_at is null or ended_at >= started_at)
);

-- One row per player per game. Exactly one durak and >= 3 players are enforced
-- by deferred constraint triggers (see below), since partial unique indexes can
-- only guarantee "at most one".
create table game_players (
  game_id      uuid not null references games (id) on delete cascade,
  player_id    uuid not null references players (id) on delete restrict,
  is_durak     boolean not null default false,
  is_first_out boolean not null default false,
  is_last_out  boolean not null default false,
  primary key (game_id, player_id),
  -- A player may hold at most one of the three outcome roles.
  constraint game_players_one_role_max
    check ((is_durak::int + is_first_out::int + is_last_out::int) <= 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- FK lookup indexes (Postgres does not auto-index FK columns).
create index group_members_user_id_idx on group_members (user_id);
create index players_group_id_idx on players (group_id);
create index players_auth_user_id_idx on players (auth_user_id) where auth_user_id is not null;
create index games_group_id_idx on games (group_id);
create index games_started_at_idx on games (group_id, started_at desc);
create index game_players_player_id_idx on game_players (player_id);

-- At most one of each outcome role per game.
create unique index game_players_one_durak_per_game
  on game_players (game_id) where is_durak;
create unique index game_players_one_first_out_per_game
  on game_players (game_id) where is_first_out;
create unique index game_players_one_last_out_per_game
  on game_players (game_id) where is_last_out;

-- ============================================================================
-- FUNCTIONS — updated_at
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- FUNCTIONS — game integrity (min 3 players, exactly one durak)
-- ============================================================================

-- Checked at COMMIT (deferred), once all of a game's rows are in place.
create or replace function check_game_player_integrity(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  v_total int;
  v_durak int;
begin
  -- Game removed within the same transaction (e.g. cascade delete): nothing to check.
  if not exists (select 1 from games where id = p_game_id) then
    return;
  end if;

  select count(*), count(*) filter (where is_durak)
    into v_total, v_durak
  from game_players
  where game_id = p_game_id;

  if v_total < 3 then
    raise exception 'Game % must have at least 3 players (has %)', p_game_id, v_total
      using errcode = 'check_violation';
  end if;

  if v_durak <> 1 then
    raise exception 'Game % must have exactly one durak (has %)', p_game_id, v_durak
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function trg_game_players_integrity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform check_game_player_integrity(old.game_id);
    return old;
  end if;
  perform check_game_player_integrity(new.game_id);
  return new;
end;
$$;

create or replace function trg_games_integrity()
returns trigger
language plpgsql
as $$
begin
  perform check_game_player_integrity(new.id);
  return new;
end;
$$;

-- ============================================================================
-- FUNCTIONS — RLS helpers (SECURITY DEFINER avoids recursive RLS evaluation)
-- ============================================================================

create or replace function is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function is_member_of_game(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from games g
    join group_members m on m.group_id = g.group_id
    where g.id = p_game_id and m.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- FUNCTIONS — onboarding RPC
-- ============================================================================

-- Atomically create a group, make the caller its owner, and create the caller's
-- player row. SECURITY DEFINER so it can seed group_members before any RLS
-- membership exists (resolves the onboarding chicken-and-egg).
create or replace function create_group(
  p_name         text,
  p_timezone     text default 'UTC',
  p_display_name text default null
)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_group groups;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  insert into groups (name, timezone, created_by)
  values (p_name, coalesce(nullif(trim(p_timezone), ''), 'UTC'), v_uid)
  returning * into v_group;

  insert into group_members (group_id, user_id, role)
  values (v_group.id, v_uid, 'owner');

  insert into players (group_id, display_name, auth_user_id)
  values (v_group.id, coalesce(nullif(trim(p_display_name), ''), 'Me'), v_uid);

  return v_group;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger groups_set_updated_at
  before update on groups
  for each row execute function set_updated_at();

create trigger players_set_updated_at
  before update on players
  for each row execute function set_updated_at();

create trigger games_set_updated_at
  before update on games
  for each row execute function set_updated_at();

-- Deferred integrity: evaluated at COMMIT so multi-statement inserts are allowed.
create constraint trigger game_players_integrity
  after insert or update or delete on game_players
  deferrable initially deferred
  for each row execute function trg_game_players_integrity();

create constraint trigger games_integrity
  after insert or update on games
  deferrable initially deferred
  for each row execute function trg_games_integrity();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table groups        enable row level security;
alter table group_members enable row level security;
alter table players       enable row level security;
alter table games         enable row level security;
alter table game_players  enable row level security;

-- groups
create policy groups_select on groups
  for select to authenticated
  using (is_group_member(id));

create policy groups_insert on groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy groups_update on groups
  for update to authenticated
  using (is_group_owner(id))
  with check (is_group_owner(id));

create policy groups_delete on groups
  for delete to authenticated
  using (is_group_owner(id));

-- group_members (initial owner row is created by create_group, which bypasses RLS)
create policy group_members_select on group_members
  for select to authenticated
  using (is_group_member(group_id));

create policy group_members_insert on group_members
  for insert to authenticated
  with check (is_group_owner(group_id));

create policy group_members_update on group_members
  for update to authenticated
  using (is_group_owner(group_id))
  with check (is_group_owner(group_id));

create policy group_members_delete on group_members
  for delete to authenticated
  using (is_group_owner(group_id));

-- players
create policy players_select on players
  for select to authenticated
  using (is_group_member(group_id));

create policy players_insert on players
  for insert to authenticated
  with check (is_group_member(group_id));

create policy players_update on players
  for update to authenticated
  using (is_group_member(group_id))
  with check (is_group_member(group_id));

-- games (no update/delete in v1 — edit/delete is a roadmap item)
create policy games_select on games
  for select to authenticated
  using (is_group_member(group_id));

create policy games_insert on games
  for insert to authenticated
  with check (is_group_member(group_id) and logged_by = auth.uid());

-- game_players (no update/delete in v1)
create policy game_players_select on game_players
  for select to authenticated
  using (is_member_of_game(game_id));

create policy game_players_insert on game_players
  for insert to authenticated
  with check (is_member_of_game(game_id));

-- ============================================================================
-- GRANTS (RLS still gates every row; these grant table-level DML to the role)
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  groups, group_members, players, games, game_players
  to authenticated;
grant execute on function create_group(text, text, text) to authenticated;
