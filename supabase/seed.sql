-- Durak Tracker — seed data for validating schema, constraints, and triggers.
-- Runs as the postgres role (bypasses RLS). Wrapped in one transaction so the
-- DEFERRABLE INITIALLY DEFERRED integrity triggers (min 3 players, exactly one
-- durak) are evaluated at COMMIT, once every game has its players.
-- Idempotent: re-running is a no-op via ON CONFLICT DO NOTHING.

begin;

-- ---------------------------------------------------------------------------
-- Auth users (minimal fixture rows; FKs reference auth.users(id)). All fake
-- @example.com accounts — no real identities in the committed seed.
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
   now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'forrest@example.com', '{"provider":"email","providers":["email"]}',
   '{"full_name":"Forrest Samuels"}',
   now(), now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Group + membership.
-- ---------------------------------------------------------------------------
-- Forrest (fixture user) owns both groups.
insert into groups (id, name, timezone, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Test Group', 'America/New_York',
   '33333333-3333-3333-3333-333333333333'),
  ('a0000000-0000-0000-0000-000000000002', 'Walla Walla Run Club', 'America/Los_Angeles',
   '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into group_members (group_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member'),
  ('a0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'owner')
on conflict (group_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Test Group players: two registered (linked to auth users) + two guests.
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

-- A dozen extra Test Group guests (random names) to exercise larger rosters.
insert into players (id, group_id, display_name, auth_user_id) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Olivia Bennett',  null),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Marcus Reed',     null),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Priya Nair',      null),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Tom Becker',      null),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Sofia Ramirez',   null),
  ('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Liam Foster',     null),
  ('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Hana Kim',        null),
  ('f0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Diego Alvarez',   null),
  ('f0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Nora Whitfield',  null),
  ('f0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Sam Okafor',      null),
  ('f0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Ivy Larsson',     null),
  ('f0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Theo Russo',      null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Walla Walla Run Club players (guests), listed alphabetically by display name.
-- ---------------------------------------------------------------------------
insert into players (id, group_id, display_name, auth_user_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Aaron McAdie',              null),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Andy Steele',               null),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Ben Mattice',               null),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Ben Wentz',                 null),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Bildad K Bildad',           null),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Chris Peery',               null),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Christian Gonzalez-Pereda', null),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Christy Kuhlman',           null),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Devin Schell',              null),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Greg Romaniuk',             null),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Jacquie Gallaway',          null),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'Joe Nevshemal',             null),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Joey H',                    null),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'Jon Rickard',               null),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'Laurencio Cota',            null),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000002', 'Lia Prins',                 null),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000002', 'Matt Manley',               null),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000002', 'Michael Thompson-Maret',    null),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002', 'Shandiin Yessilth',         null)
on conflict (id) do nothing;

-- Forrest Samuels (registered owner of both groups), linked to the fixture user.
insert into players (id, group_id, display_name, auth_user_id) values
  ('33333333-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Forrest Samuels', '33333333-3333-3333-3333-333333333333'),
  ('33333333-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   'Forrest Samuels', '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Games (all logged by Alice).
-- ---------------------------------------------------------------------------
-- All seeded games are completed (status defaults to in_progress post-M8).
insert into games (id, group_id, started_at, ended_at, trump_suit, deck_count, logged_by, notes, status) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-01 18:00:00-04', '2026-06-01 18:45:00-04', 'hearts', 1,
   '11111111-1111-1111-1111-111111111111', 'Season opener', 'completed'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-03 19:00:00-04', '2026-06-03 19:30:00-04', 'spades', 1,
   '11111111-1111-1111-1111-111111111111', null, 'completed'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-08 18:30:00-04', null, 'hearts', 1,
   '11111111-1111-1111-1111-111111111111', 'Forgot to stop the clock', 'completed'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   '2026-06-10 20:00:00-04', '2026-06-10 20:50:00-04', 'diamonds', 2,
   '11111111-1111-1111-1111-111111111111', 'Two decks, five-ish hands', 'completed')
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

-- ---------------------------------------------------------------------------
-- Bulk Test Group games: 30 games over a 4-week window (2026-05-18 .. 06-14),
-- drawn from the full 17-player Test Group roster. Generated deterministically
-- (setseed + fixed game ids '20000000-…-NN') so re-running is a no-op and the
-- deferred integrity triggers hold: each game gets 3–6 distinct players, exactly
-- one durak, and at most one first-out / last-out (positions 1/2/3 of a randomly
-- shuffled lineup, so durak ≠ first-out ≠ last-out by construction).
-- ---------------------------------------------------------------------------
do $$
declare
  test_group constant uuid := 'a0000000-0000-0000-0000-000000000001';
  forrest    constant uuid := '33333333-3333-3333-3333-333333333333';
  n_games    constant int  := 30;
  window_days constant numeric := 27;            -- first..last game span (days)
  base_ts    constant timestamptz := '2026-05-18 17:00:00-04';
  roster uuid[] := array[
    'a1a1a1a1-0000-0000-0000-000000000001',      -- Alice
    'b2b2b2b2-0000-0000-0000-000000000002',      -- Bob
    'c3c3c3c3-0000-0000-0000-000000000003',      -- Charlie
    'd4d4d4d4-0000-0000-0000-000000000004',      -- Dana
    '33333333-0000-0000-0000-000000000001',      -- Forrest Samuels
    'f0000000-0000-0000-0000-000000000001',      -- Olivia Bennett
    'f0000000-0000-0000-0000-000000000002',      -- Marcus Reed
    'f0000000-0000-0000-0000-000000000003',      -- Priya Nair
    'f0000000-0000-0000-0000-000000000004',      -- Tom Becker
    'f0000000-0000-0000-0000-000000000005',      -- Sofia Ramirez
    'f0000000-0000-0000-0000-000000000006',      -- Liam Foster
    'f0000000-0000-0000-0000-000000000007',      -- Hana Kim
    'f0000000-0000-0000-0000-000000000008',      -- Diego Alvarez
    'f0000000-0000-0000-0000-000000000009',      -- Nora Whitfield
    'f0000000-0000-0000-0000-000000000010',      -- Sam Okafor
    'f0000000-0000-0000-0000-000000000011',      -- Ivy Larsson
    'f0000000-0000-0000-0000-000000000012'       -- Theo Russo
  ]::uuid[];
  suits trump_suit[] := array['hearts','diamonds','clubs','spades']::trump_suit[];
  i          int;
  gid        uuid;
  started    timestamptz;
  ended      timestamptz;
  duration   int;
  n_players  int;
  chosen     uuid[];
  has_first  boolean;
  has_last   boolean;
  j          int;
begin
  perform setseed(0.20260616);
  for i in 1..n_games loop
    gid := ('20000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    started := base_ts
      + (((i - 1) * window_days / (n_games - 1)) || ' days')::interval
      + (floor(random() * 6)::text || ' hours')::interval        -- 17:00–22:00
      + (floor(random() * 60)::text || ' minutes')::interval;
    duration := 25 + floor(random() * 45)::int;                  -- 25–69 min
    ended := case when random() < 0.1 then null
                  else started + (duration || ' minutes')::interval end;

    insert into games (id, group_id, started_at, ended_at, trump_suit, deck_count, logged_by, notes, status)
    values (gid, test_group, started, ended,
            suits[1 + floor(random() * 4)::int],
            case when random() < 0.7 then 1 else 2 end,
            forrest, null, 'completed')
    on conflict (id) do nothing;

    n_players := 3 + floor(random() * 4)::int;                   -- 3–6 players
    select array_agg(p order by random()) into chosen from unnest(roster) as p;
    has_first := random() < 0.9;
    has_last  := random() < 0.75;

    for j in 1..n_players loop
      insert into game_players (game_id, player_id, is_durak, is_first_out, is_last_out)
      values (gid, chosen[j], j = 1, j = 2 and has_first, j = 3 and has_last)
      on conflict (game_id, player_id) do nothing;
    end loop;
  end loop;
end $$;

commit;
