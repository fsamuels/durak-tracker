-- Durak Tracker — seed data for validating schema, constraints, and triggers.
-- Runs as the postgres role (bypasses RLS). Wrapped in one transaction so the
-- DEFERRABLE INITIALLY DEFERRED integrity triggers (min 3 players, exactly one
-- durak) are evaluated at COMMIT, once every game has its players.
-- Idempotent: re-running is a no-op via ON CONFLICT DO NOTHING.

begin;

-- ---------------------------------------------------------------------------
-- Auth users (minimal rows; FKs reference auth.users(id)).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  raw_app_meta_data, raw_user_meta_data,
  email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'alice@example.com', '{"provider":"email","providers":["email"]}', '{}',
   now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'bob@example.com', '{"provider":"email","providers":["email"]}', '{}',
   now(), now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Group + membership.
-- ---------------------------------------------------------------------------
insert into groups (id, name, timezone, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Run Club', 'America/New_York',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into group_members (group_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member')
on conflict (group_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Players: two registered (linked to auth users) + two guests.
-- ---------------------------------------------------------------------------
insert into players (id, group_id, display_name, auth_user_id) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Alice', '11111111-1111-1111-1111-111111111111'),
  ('b2b2b2b2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Bob', '22222222-2222-2222-2222-222222222222'),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Charlie', null),
  ('d4d4d4d4-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Dana', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Games (all logged by Alice).
-- ---------------------------------------------------------------------------
insert into games (id, group_id, started_at, ended_at, trump_suit, deck_count, logged_by, notes) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-01 18:00:00-04', '2026-06-01 18:45:00-04', 'hearts', 1,
   '11111111-1111-1111-1111-111111111111', 'Season opener'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-03 19:00:00-04', '2026-06-03 19:30:00-04', 'spades', 1,
   '11111111-1111-1111-1111-111111111111', null),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-08 18:30:00-04', null, 'hearts', 1,
   '11111111-1111-1111-1111-111111111111', 'Forgot to stop the clock'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-10 20:00:00-04', '2026-06-10 20:50:00-04', 'diamonds', 2,
   '11111111-1111-1111-1111-111111111111', 'Two decks, five-ish hands')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Game players. Each multi-row insert lists every participant for that game;
-- exactly one is_durak per game, >= 3 players per game.
-- ---------------------------------------------------------------------------

-- Game 1: Alice, Bob, Charlie, Dana — durak Charlie, first out Alice, last out Bob.
insert into game_players (game_id, player_id, is_durak, is_first_out, is_last_out) values
  ('10000000-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000001', false, true,  false),
  ('10000000-0000-0000-0000-000000000001', 'b2b2b2b2-0000-0000-0000-000000000002', false, false, true),
  ('10000000-0000-0000-0000-000000000001', 'c3c3c3c3-0000-0000-0000-000000000003', true,  false, false),
  ('10000000-0000-0000-0000-000000000001', 'd4d4d4d4-0000-0000-0000-000000000004', false, false, false)
on conflict (game_id, player_id) do nothing;

-- Game 2: Alice, Bob, Charlie — durak Bob, first out Charlie.
insert into game_players (game_id, player_id, is_durak, is_first_out, is_last_out) values
  ('10000000-0000-0000-0000-000000000002', 'a1a1a1a1-0000-0000-0000-000000000001', false, false, true),
  ('10000000-0000-0000-0000-000000000002', 'b2b2b2b2-0000-0000-0000-000000000002', true,  false, false),
  ('10000000-0000-0000-0000-000000000002', 'c3c3c3c3-0000-0000-0000-000000000003', false, true,  false)
on conflict (game_id, player_id) do nothing;

-- Game 3: Alice, Bob, Charlie, Dana — durak Charlie, first out Dana, last out Alice.
insert into game_players (game_id, player_id, is_durak, is_first_out, is_last_out) values
  ('10000000-0000-0000-0000-000000000003', 'a1a1a1a1-0000-0000-0000-000000000001', false, false, true),
  ('10000000-0000-0000-0000-000000000003', 'b2b2b2b2-0000-0000-0000-000000000002', false, false, false),
  ('10000000-0000-0000-0000-000000000003', 'c3c3c3c3-0000-0000-0000-000000000003', true,  false, false),
  ('10000000-0000-0000-0000-000000000003', 'd4d4d4d4-0000-0000-0000-000000000004', false, true,  false)
on conflict (game_id, player_id) do nothing;

-- Game 4: Alice, Bob, Dana — durak Alice, first out Dana.
insert into game_players (game_id, player_id, is_durak, is_first_out, is_last_out) values
  ('10000000-0000-0000-0000-000000000004', 'a1a1a1a1-0000-0000-0000-000000000001', true,  false, false),
  ('10000000-0000-0000-0000-000000000004', 'b2b2b2b2-0000-0000-0000-000000000002', false, false, true),
  ('10000000-0000-0000-0000-000000000004', 'd4d4d4d4-0000-0000-0000-000000000004', false, true,  false)
on conflict (game_id, player_id) do nothing;

commit;
