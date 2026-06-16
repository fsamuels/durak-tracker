-- Durak Tracker — two-part game logging (milestone 8)
-- Splits logging into a START step (game created in_progress, >= 1 player) and a
-- FINISH step (remaining players + outcomes recorded, game marked completed).
-- This replaces the one-shot log_game flow (M4) in the UI; log_game itself is
-- left in place but unused.
--
-- Design (mirrors log_game's M4 pattern): start_game / finish_game are
-- SECURITY INVOKER so RLS still gates every row, and logged_by is taken from
-- auth.uid() rather than trusted from the client. Each does its multi-row work
-- in one transaction so the DEFERRABLE INITIALLY DEFERRED integrity triggers
-- validate at COMMIT with every row present.

-- ============================================================================
-- ENUM + COLUMN
-- ============================================================================

create type game_status as enum ('in_progress', 'completed');

-- New games default to in_progress; finish_game flips them to completed. Every
-- pre-existing game was one-shot logged (M4), i.e. already complete.
alter table games
  add column status game_status not null default 'in_progress';

create index games_status_idx on games (group_id, status);

-- Backfill after the index: this UPDATE queues the DEFERRABLE games_integrity
-- trigger, and Postgres forbids CREATE INDEX while a transaction has pending
-- trigger events. The deferred check (re-defined below) runs at COMMIT, by which
-- point every pre-existing game is a valid completed game.
update games set status = 'completed';

-- ============================================================================
-- INTEGRITY — apply the full invariants only to COMPLETED games
-- ============================================================================
-- An in-progress game only needs >= 1 player (the start roster); the >= 3
-- players / exactly-one-durak rules are enforced when (and only when) the game
-- is marked completed. The games-level trigger still fires on the status flip,
-- so finishing re-checks the game with every player row in place.
create or replace function check_game_player_integrity(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  v_status game_status;
  v_total  int;
  v_durak  int;
begin
  -- Game removed within the same transaction (e.g. cascade delete): nothing to check.
  select status into v_status from games where id = p_game_id;
  if not found then
    return;
  end if;

  select count(*), count(*) filter (where is_durak)
    into v_total, v_durak
  from game_players
  where game_id = p_game_id;

  if v_status = 'in_progress' then
    -- A started game just needs at least one player on the roster.
    if v_total < 1 then
      raise exception 'In-progress game % must have at least 1 player', p_game_id
        using errcode = 'check_violation';
    end if;
    return;
  end if;

  -- Completed game: the full M4 invariants.
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

-- ============================================================================
-- RLS — two-part logging needs games + game_players to be UPDATEable
-- ============================================================================
-- v1 was insert-only ("no edit/delete"). Finishing a game updates games
-- (status / ended_at / trump / deck / notes) and reconciles game_players
-- (set outcomes, add late joiners, drop a no-show), so members of a group need
-- update/delete on those rows. Scope mirrors the existing select policies via
-- is_group_member / is_member_of_game. General-purpose edit/delete of a game
-- remains a deferred roadmap item; the app only mutates via the RPCs below.

create policy games_update on games
  for update to authenticated
  using (is_group_member(group_id))
  with check (is_group_member(group_id) and logged_by = auth.uid());

create policy game_players_update on game_players
  for update to authenticated
  using (is_member_of_game(game_id))
  with check (is_member_of_game(game_id));

create policy game_players_delete on game_players
  for delete to authenticated
  using (is_member_of_game(game_id));

-- ============================================================================
-- start_game — create an in-progress game with its starting roster
-- ============================================================================
-- p_participants: [{"player_id": uuid}, ...] (>= 1). Outcomes are not recorded
-- at start — every starter goes in with no role; finish_game sets them. started_at
-- is stamped here (now()); there is no time field in the UI.
create or replace function start_game(
  p_group_id     uuid,
  p_participants jsonb,
  p_trump_suit   trump_suit default null,
  p_deck_count   int        default null,
  p_notes        text       default null
)
returns games
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  insert into games (
    group_id, started_at, trump_suit, deck_count, notes, logged_by, status
  )
  values (
    p_group_id,
    now(),
    p_trump_suit,
    p_deck_count,
    nullif(trim(p_notes), ''),
    v_uid,
    'in_progress'
  )
  returning * into v_game;

  insert into game_players (game_id, player_id)
  select v_game.id, (e ->> 'player_id')::uuid
  from jsonb_array_elements(p_participants) as e;

  -- Deferred integrity (>= 1 player for in_progress) fires at COMMIT.
  return v_game;
end;
$$;

-- ============================================================================
-- finish_game — record final roster + outcomes and mark the game completed
-- ============================================================================
-- p_participants is the authoritative final roster:
--   [{"player_id":uuid,"is_durak":bool,"is_first_out":bool,"is_last_out":bool}, ...]
-- It upserts outcomes onto starters, inserts late joiners, and drops anyone no
-- longer present. ended_at is stamped now(); trump/deck/notes are taken from the
-- finish form (which pre-fills the started values). Only an in_progress game can
-- be finished. Deferred integrity (>= 3 players, exactly one durak) validates at
-- COMMIT with the completed status and every row in place.
create or replace function finish_game(
  p_game_id      uuid,
  p_participants jsonb,
  p_trump_suit   trump_suit default null,
  p_deck_count   int        default null,
  p_notes        text       default null
)
returns games
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  update games
  set
    status     = 'completed',
    ended_at   = now(),
    trump_suit = p_trump_suit,
    deck_count = p_deck_count,
    notes      = nullif(trim(p_notes), '')
  where id = p_game_id and status = 'in_progress'
  returning * into v_game;

  if not found then
    raise exception 'No in-progress game % to finish', p_game_id
      using errcode = 'no_data_found';
  end if;

  -- Reconcile the roster: set outcomes on existing rows, add new players, drop
  -- any starter no longer in the final roster.
  insert into game_players (
    game_id, player_id, is_durak, is_first_out, is_last_out
  )
  select
    v_game.id,
    (e ->> 'player_id')::uuid,
    coalesce((e ->> 'is_durak')::boolean, false),
    coalesce((e ->> 'is_first_out')::boolean, false),
    coalesce((e ->> 'is_last_out')::boolean, false)
  from jsonb_array_elements(p_participants) as e
  on conflict (game_id, player_id) do update set
    is_durak     = excluded.is_durak,
    is_first_out = excluded.is_first_out,
    is_last_out  = excluded.is_last_out;

  delete from game_players
  where game_id = v_game.id
    and player_id not in (
      select (e ->> 'player_id')::uuid
      from jsonb_array_elements(p_participants) as e
    );

  return v_game;
end;
$$;

grant execute on function
  start_game(uuid, jsonb, trump_suit, int, text)
  to authenticated;
grant execute on function
  finish_game(uuid, jsonb, trump_suit, int, text)
  to authenticated;
