-- ============================================================
-- ONDULER — FULL SCHEMA MIGRATION
-- Paste into Supabase SQL Editor and run.
-- Drops all existing app data and recreates from scratch.
-- ============================================================


-- 1. DROP OLD TABLES
DROP TABLE IF EXISTS milestone_hits CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS wave_checkins CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;


-- 2. CREATE NEW TABLES
-- chapters must precede the entity tables: motions/swells/groups/logs/
-- wave_checkins all carry a chapter_id FK (ADR 0009).

CREATE TABLE chapters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id      uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  color           text        NOT NULL DEFAULT '#6366f1',
  color_picked_in text        NOT NULL DEFAULT 'light' CHECK (color_picked_in IN ('light', 'dark')),
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE motions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id     uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  default_points int         NOT NULL DEFAULT 1,
  default_hours  numeric(5,2) NOT NULL DEFAULT 1.00,
  group_id       uuid        REFERENCES groups(id) ON DELETE SET NULL,
  parent_id      uuid        REFERENCES motions(id) ON DELETE CASCADE,
  submotion_mode text        CHECK (submotion_mode IS NULL OR submotion_mode IN ('distribute', 'rollup')),
  hidden         boolean     NOT NULL DEFAULT false,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE swells (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id      uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  color           text        NOT NULL DEFAULT '#6b7280',
  target_points   int,
  target_hours    numeric(8,2),
  group_id        uuid        REFERENCES groups(id) ON DELETE SET NULL,
  color_picked_in text        NOT NULL DEFAULT 'light' CHECK (color_picked_in IN ('light', 'dark')),
  hidden          boolean     NOT NULL DEFAULT false,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- junction: one motion can belong to many swells (with contribution weight)
CREATE TABLE motion_swells (
  motion_id           uuid         NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
  swell_id            uuid         NOT NULL REFERENCES swells(id)  ON DELETE CASCADE,
  contribution_weight numeric(5,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (motion_id, swell_id)
);

CREATE TABLE logs (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid         NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  motion_id  uuid         REFERENCES motions(id) ON DELETE CASCADE,
  points     int          NOT NULL DEFAULT 0,
  hours      numeric(5,2) NOT NULL DEFAULT 0,
  logged_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE wave_checkins (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id       uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  energy           numeric     NOT NULL,
  alignment        numeric     NOT NULL,
  duration_seconds int,
  checked_in_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE milestones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swell_id     uuid        NOT NULL REFERENCES swells(id) ON DELETE CASCADE,
  motion_id    uuid        NULL REFERENCES motions(id) ON DELETE SET NULL, -- recurring: linked motion for auto-progress
  name         text        NOT NULL,
  kind         text        NOT NULL CHECK (kind IN ('recurring', 'one_shot')),
  cadence      text        NULL,            -- recurring: 'weekly', 'monthly', etc.
  target_count int         NULL,            -- recurring: hits per cadence window
  completed_at timestamptz NULL,            -- one_shot: when marked done
  bonus_points int         NOT NULL DEFAULT 0,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Event log: one row per recurring cycle hit (or any manual hit-mark).
-- Bonus points accrue to the parent milestone's swell at hit_at; the
-- proficiency view, swell aggregates, and activity feed all join here.
CREATE TABLE milestone_hits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id uuid        NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  hit_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id             uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  onboarding_mode     text,
  theme               text    NOT NULL DEFAULT 'default',
  daily_goal          int     NOT NULL DEFAULT 20,
  daily_goal_hours    numeric NOT NULL DEFAULT 4.00,
  tracking_mode       text    NOT NULL DEFAULT 'points' CHECK (tracking_mode IN ('points', 'hours')),
  groups_enabled      boolean NOT NULL DEFAULT false,
  submotions_enabled  boolean NOT NULL DEFAULT false,
  is_admin            boolean NOT NULL DEFAULT false,
  celebration_enabled boolean NOT NULL DEFAULT true,
  haptic_enabled      boolean NOT NULL DEFAULT true,
  primary_build       text    NULL,
  secondary_build     text    NULL,
  welcome_back_mode       text        NULL CHECK (welcome_back_mode IS NULL OR welcome_back_mode IN ('ease', 'full')),
  welcome_back_started_at timestamptz NULL,
  mvs_motions             jsonb       NULL, -- per-shape: { "<build_key>": ["motion_id", ...] }
  stripe_customer_id      text        UNIQUE,
  subscription_status     text        DEFAULT 'none'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'lifetime', 'none')),
  subscription_id         text        UNIQUE,
  current_period_end      timestamptz,
  hints_seen              jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS user_settings_stripe_customer_idx
  ON user_settings (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ADR 0007: Reflections surface (now Anchors per ADR 0008). Reflections are
-- chapter-scoped (ceremony + free-form entries). Chapters table itself sits
-- at the top of the schema (ADR 0009) so the entity tables can reference it.
CREATE TABLE reflections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id       uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  cycle_type       text        NOT NULL CHECK (cycle_type IN ('week', 'month', 'quarter', 'year', 'free')),
  cycle_start      date,
  cycle_end        date,
  expectation_text text,
  observation_text text,
  did_tune         boolean,
  body_text        text,
  prompt_text      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);


-- 3. ROW LEVEL SECURITY

ALTER TABLE motions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE swells       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE motion_swells ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_hits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own motions"        ON motions        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own swells"         ON swells         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own groups"         ON groups         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own logs"           ON logs           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own milestones"     ON milestones     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own milestone_hits" ON milestone_hits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own wave_checkins"  ON wave_checkins  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own user_settings"  ON user_settings  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own chapters"       ON chapters       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own reflections"    ON reflections    FOR ALL USING (auth.uid() = user_id);

-- motion_swells: ownership via the motion
CREATE POLICY "own motion_swells" ON motion_swells FOR ALL USING (
  EXISTS (SELECT 1 FROM motions WHERE motions.id = motion_swells.motion_id AND motions.user_id = auth.uid())
);


-- 4. INDEXES

CREATE INDEX ON motions (user_id);
CREATE INDEX ON motions (parent_id);
CREATE INDEX ON motions (group_id);
CREATE INDEX ON motions (user_id, group_id);
CREATE INDEX motions_user_chapter_idx ON motions (user_id, chapter_id);
CREATE INDEX ON swells (user_id);
CREATE INDEX ON swells (group_id);
CREATE INDEX swells_hidden_idx ON swells (user_id, hidden);
CREATE INDEX swells_user_chapter_idx ON swells (user_id, chapter_id);
CREATE INDEX ON groups (user_id);
CREATE INDEX groups_user_chapter_idx ON groups (user_id, chapter_id);
CREATE INDEX ON motion_swells (swell_id);
CREATE INDEX ON logs (user_id, logged_at DESC);
CREATE INDEX ON logs (motion_id);
CREATE INDEX logs_user_chapter_idx ON logs (user_id, chapter_id, logged_at DESC);
CREATE INDEX milestones_swell_id_idx ON milestones (swell_id);
CREATE INDEX milestones_user_id_idx  ON milestones (user_id);
CREATE INDEX milestones_motion_id_idx ON milestones (motion_id);
CREATE INDEX milestone_hits_milestone_id_idx ON milestone_hits (milestone_id);
CREATE INDEX milestone_hits_user_id_idx ON milestone_hits (user_id);
CREATE INDEX milestone_hits_hit_at_idx ON milestone_hits (hit_at);
CREATE INDEX ON wave_checkins (user_id);
CREATE INDEX wave_checkins_user_chapter_idx ON wave_checkins (user_id, chapter_id);
CREATE UNIQUE INDEX chapters_one_active_per_user ON chapters (user_id) WHERE ended_at IS NULL;
CREATE INDEX chapters_user_sort ON chapters (user_id, sort_order);
CREATE INDEX reflections_user_chapter ON reflections (user_id, chapter_id, created_at DESC);
CREATE INDEX reflections_user_cycle ON reflections (user_id, cycle_type, cycle_start);

-- Waitlist (public, anon-insert)
CREATE TABLE waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  frustration text,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX waitlist_email_key ON waitlist (email);
CREATE POLICY "anon insert" ON waitlist FOR INSERT TO anon WITH CHECK (true);

-- Contact form submissions (public, anon-insert)
CREATE TABLE contact_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text NOT NULL,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert" ON contact_submissions FOR INSERT TO anon WITH CHECK (true);
