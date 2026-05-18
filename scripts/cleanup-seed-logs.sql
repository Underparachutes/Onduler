-- Cleanup for the seed inserted by scripts/seed-logs.mjs.
--
-- Why this works: seed-logs.mjs writes timestamps at whole-second precision
-- (e.g. '2026-05-17T19:33:55-08:00'). Real logs created by the app go through
-- `new Date().toISOString()` and carry sub-second precision (e.g.
-- '03:19:23.860084+00'). Filtering to seed-window dates AND zero microseconds
-- catches every seed row without ever touching a user-created log.
--
-- Tighten further by user_id and a tight date window so this stays narrowly
-- scoped even if the precision heuristic ever drifts.

DELETE FROM logs
WHERE user_id = '86f20c8d-0a02-4f4c-8834-743c368e6f46'
  AND logged_at >= '2026-02-22'
  AND logged_at < '2026-05-18 12:00:00+00'
  AND date_trunc('second', logged_at) = logged_at;
