-- ADR 0009: Archive-and-fresh-start.
-- Adds chapter_id FK to entity tables and backfills to each user's
-- existing active chapter (or creates one if missing).
--
-- Run once in the Supabase SQL Editor.

BEGIN;

-- 1. Ensure every user with data has an active chapter. Existing users were
--    backfilled to a Chapter 1 in the ADR 0007 migration; this is the
--    safety net for any edge case (e.g. a user signed up post-backfill but
--    pre-Anchors-E).
INSERT INTO chapters (user_id, started_at)
SELECT DISTINCT u.user_id, COALESCE(MIN(u.first_at), now())
FROM (
  SELECT user_id, MIN(created_at) AS first_at FROM motions GROUP BY user_id
  UNION ALL
  SELECT user_id, MIN(created_at) FROM swells GROUP BY user_id
  UNION ALL
  SELECT user_id, MIN(logged_at)  FROM logs GROUP BY user_id
) u
WHERE NOT EXISTS (
  SELECT 1 FROM chapters c WHERE c.user_id = u.user_id AND c.ended_at IS NULL
)
GROUP BY u.user_id;

-- 2. Add chapter_id column (nullable for the moment so the backfill can run).
ALTER TABLE motions       ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE swells        ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE groups        ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE logs          ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE wave_checkins ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;

-- 3. Backfill: each row's chapter_id := the user's active chapter.
--    All existing data is implicitly Chapter 1 (or whatever active chapter
--    the user has after step 1).
UPDATE motions m
SET chapter_id = c.id
FROM chapters c
WHERE c.user_id = m.user_id AND c.ended_at IS NULL AND m.chapter_id IS NULL;

UPDATE swells s
SET chapter_id = c.id
FROM chapters c
WHERE c.user_id = s.user_id AND c.ended_at IS NULL AND s.chapter_id IS NULL;

UPDATE groups g
SET chapter_id = c.id
FROM chapters c
WHERE c.user_id = g.user_id AND c.ended_at IS NULL AND g.chapter_id IS NULL;

UPDATE logs l
SET chapter_id = c.id
FROM chapters c
WHERE c.user_id = l.user_id AND c.ended_at IS NULL AND l.chapter_id IS NULL;

UPDATE wave_checkins w
SET chapter_id = c.id
FROM chapters c
WHERE c.user_id = w.user_id AND c.ended_at IS NULL AND w.chapter_id IS NULL;

-- 4. Lock the column NOT NULL now that every row has a value.
ALTER TABLE motions       ALTER COLUMN chapter_id SET NOT NULL;
ALTER TABLE swells        ALTER COLUMN chapter_id SET NOT NULL;
ALTER TABLE groups        ALTER COLUMN chapter_id SET NOT NULL;
ALTER TABLE logs          ALTER COLUMN chapter_id SET NOT NULL;
ALTER TABLE wave_checkins ALTER COLUMN chapter_id SET NOT NULL;

-- 5. Indexes for the active-chapter filter (user_id + chapter_id is the
--    composite shape every query uses).
CREATE INDEX IF NOT EXISTS motions_user_chapter_idx       ON motions       (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS swells_user_chapter_idx        ON swells        (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS groups_user_chapter_idx        ON groups        (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS logs_user_chapter_idx          ON logs          (user_id, chapter_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS wave_checkins_user_chapter_idx ON wave_checkins (user_id, chapter_id);

COMMIT;
