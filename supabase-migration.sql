-- ============================================================
-- ONDULER — FULL SCHEMA MIGRATION
-- Paste into Supabase SQL Editor and run.
-- Drops all existing app data and recreates from scratch.
-- ============================================================


-- 1. DROP OLD TABLES
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS wave_checkins CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;


-- 2. CREATE NEW TABLES
-- (groups must precede motions: motions.group_id references groups.id)

CREATE TABLE groups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        NOT NULL DEFAULT '#6366f1',
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE motions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  default_points int         NOT NULL DEFAULT 1,
  default_hours  numeric(5,2) NOT NULL DEFAULT 1.00,
  group_id       uuid        REFERENCES groups(id) ON DELETE SET NULL,
  parent_id      uuid        REFERENCES motions(id) ON DELETE CASCADE,
  hidden         boolean     NOT NULL DEFAULT false,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE swells (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  color         text        NOT NULL DEFAULT '#6b7280',
  target_points int,
  target_hours  numeric(8,2),
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- junction: one motion can belong to many swells (with contribution weight)
CREATE TABLE motion_swells (
  motion_id           uuid         NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
  swell_id            uuid         NOT NULL REFERENCES swells(id)  ON DELETE CASCADE,
  contribution_weight numeric(5,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (motion_id, swell_id)
);

CREATE TABLE logs (
  id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motion_id uuid         REFERENCES motions(id) ON DELETE CASCADE,
  points    int          NOT NULL DEFAULT 0,
  hours     numeric(5,2) NOT NULL DEFAULT 0,
  logged_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE wave_checkins (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy           numeric     NOT NULL,
  alignment        numeric     NOT NULL,
  duration_seconds int,
  checked_in_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id             uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  onboarding_mode     text,
  theme               text    NOT NULL DEFAULT 'default',
  daily_goal          int     NOT NULL DEFAULT 20,
  groups_enabled      boolean NOT NULL DEFAULT false,
  celebration_enabled boolean NOT NULL DEFAULT true,
  haptic_enabled      boolean NOT NULL DEFAULT true
);


-- 3. ROW LEVEL SECURITY

ALTER TABLE motions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE swells       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE motion_swells ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own motions"       ON motions       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own swells"        ON swells        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own groups"        ON groups        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own logs"          ON logs          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own wave_checkins" ON wave_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own user_settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- motion_swells: ownership via the motion
CREATE POLICY "own motion_swells" ON motion_swells FOR ALL USING (
  EXISTS (SELECT 1 FROM motions WHERE motions.id = motion_swells.motion_id AND motions.user_id = auth.uid())
);


-- 4. INDEXES

CREATE INDEX ON motions (user_id);
CREATE INDEX ON motions (parent_id);
CREATE INDEX ON motions (group_id);
CREATE INDEX ON motions (user_id, group_id);
CREATE INDEX ON swells (user_id);
CREATE INDEX ON groups (user_id);
CREATE INDEX ON motion_swells (swell_id);
CREATE INDEX ON logs (user_id, logged_at DESC);
CREATE INDEX ON logs (motion_id);
CREATE INDEX ON wave_checkins (user_id);
