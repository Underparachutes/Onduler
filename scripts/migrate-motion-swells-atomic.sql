-- Atomic motion + motion_swells writes (2026-07-02).
-- Idempotent — safe to run multiple times. APPLIED TO PROD 2026-07-02.
--
-- Problem: three server actions do a motion write and its swell-link writes as
-- separate PostgREST round-trips, so a failure between them leaves corrupt state:
--   - createMotion / duplicateMotion (app/actions/motions.ts): insert motion, then
--     insert motion_swells. A link failure leaves an orphaned motion feeding no swell.
--   - setMotionSwells (app/actions/motions.ts): delete all motion_swells for the
--     motion, then insert the new set. An insert failure leaves the motion feeding
--     ZERO swells — silent loss of contribution weights.
--
-- Fix: wrap each pair in a plpgsql function. A function body is one transaction, so
-- either the motion and all its links commit together or nothing does. SECURITY
-- INVOKER (the default) means the function runs as the calling role, so the existing
-- "own motions" / "own motion_swells" RLS policies still apply — this grants no new
-- reach. user_id is pinned to auth.uid(), matching what the JS inserts did.
--
-- p_swells is a JSON array of { "swell_id": uuid, "weight": number }. NULL / [] = no links.

-- Insert a motion and its swell links atomically. Returns the new motion row so the
-- caller gets id (and name, which duplicateMotion echoes back to the client).
CREATE OR REPLACE FUNCTION create_motion_with_swells(
  p_chapter_id     uuid,
  p_name           text,
  p_default_points int,
  p_default_hours  numeric,
  p_group_id       uuid,
  p_parent_id      uuid,
  p_sort_order     int,
  p_swells         jsonb
)
RETURNS motions
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_motion motions;
  v_entry  jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO motions (
    user_id, chapter_id, name, default_points, default_hours,
    group_id, parent_id, sort_order
  )
  VALUES (
    v_uid, p_chapter_id, p_name,
    COALESCE(p_default_points, 1), COALESCE(p_default_hours, 1.00),
    p_group_id, p_parent_id, COALESCE(p_sort_order, 0)
  )
  RETURNING * INTO v_motion;

  IF p_swells IS NOT NULL THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_swells)
    LOOP
      INSERT INTO motion_swells (motion_id, swell_id, contribution_weight)
      VALUES (
        v_motion.id,
        (v_entry->>'swell_id')::uuid,
        COALESCE((v_entry->>'weight')::numeric, 1.00)
      );
    END LOOP;
  END IF;

  RETURN v_motion;
END;
$$;

-- Replace the full set of swell links for an existing motion, atomically.
CREATE OR REPLACE FUNCTION set_motion_swells(
  p_motion_id uuid,
  p_swells    jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_entry jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Explicit ownership check for a clean error. RLS on the writes below is the
  -- real boundary (motion_swells policy checks the motion belongs to auth.uid()).
  IF NOT EXISTS (
    SELECT 1 FROM motions WHERE id = p_motion_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'motion not found';
  END IF;

  DELETE FROM motion_swells WHERE motion_id = p_motion_id;

  IF p_swells IS NOT NULL THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_swells)
    LOOP
      INSERT INTO motion_swells (motion_id, swell_id, contribution_weight)
      VALUES (
        p_motion_id,
        (v_entry->>'swell_id')::uuid,
        COALESCE((v_entry->>'weight')::numeric, 1.00)
      );
    END LOOP;
  END IF;
END;
$$;

-- PostgREST exposes these to the browser-held authenticated role. Functions are
-- EXECUTE-able by PUBLIC by default, but grant explicitly and keep anon out.
REVOKE EXECUTE ON FUNCTION create_motion_with_swells(uuid, text, int, numeric, uuid, uuid, int, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION set_motion_swells(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION create_motion_with_swells(uuid, text, int, numeric, uuid, uuid, int, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION set_motion_swells(uuid, jsonb) TO authenticated;
