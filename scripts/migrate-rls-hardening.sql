-- RLS hardening: pre-launch audit fixes
-- Idempotent — safe to run multiple times
-- 2026-05-25

BEGIN;

-- 1. Fix waitlist insert policy: scope to anon only (was public)
DROP POLICY IF EXISTS "Anyone can insert" ON waitlist;
DROP POLICY IF EXISTS "anon insert" ON waitlist;
CREATE POLICY "anon insert" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 2. Revoke all anon privileges on user-data tables
-- RLS is correct, but this adds defense-in-depth so anon
-- has zero SQL-level access to user data
REVOKE ALL ON motions        FROM anon;
REVOKE ALL ON swells         FROM anon;
REVOKE ALL ON groups         FROM anon;
REVOKE ALL ON motion_swells  FROM anon;
REVOKE ALL ON logs           FROM anon;
REVOKE ALL ON milestones     FROM anon;
REVOKE ALL ON milestone_hits FROM anon;
REVOKE ALL ON wave_checkins  FROM anon;
REVOKE ALL ON user_settings  FROM anon;
REVOKE ALL ON chapters       FROM anon;
REVOKE ALL ON reflections    FROM anon;

-- 3. Revoke dangerous privileges from authenticated
-- Users should not be able to TRUNCATE tables or manage triggers
REVOKE TRUNCATE, TRIGGER, REFERENCES ON
  motions, swells, groups, motion_swells, logs,
  milestones, milestone_hits, wave_checkins,
  user_settings, chapters, reflections,
  contact_submissions, waitlist
  FROM authenticated;

-- Also tighten anon on public-form tables (keep only INSERT)
REVOKE TRUNCATE, TRIGGER, REFERENCES, SELECT, UPDATE, DELETE ON waitlist FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES, UPDATE, DELETE ON contact_submissions FROM anon;

COMMIT;
