# Spec: Pre-launch DB hardening

*For: Claude Code. Source: Supabase security + performance advisors run against prod (`rvbdiidwslkbeoyczdvr`) on 2026-06-13, before opening signups to strangers.*

## Headline

RLS is enabled on all 13 public tables and every user-data table has an `own X` owner policy. No missing or disabled RLS, no data-exposure hole. The items below are hardening and optimization, not integrity bugs. Do the two security toggles for sure; the rest is cheap-to-do-now-while-tables-are-small but not blocking.

Current row counts (for context — small): logs 1280, motion_swells 53, motions 49, swells 34, reflections 19, milestones 17, groups 8, chapters 7, user_settings 6, milestone_hits 4, wave_checkins 3, waitlist 0, contact_submissions 0.

## Do before launch (security, both cheap)

### 1. Enable leaked-password protection
Currently disabled. Supabase Auth can reject passwords found in HaveIBeenPwned. Especially worth it because email confirmation is off for this wave (see PROJECT.md Deferred), so the password is the only credential gate. One toggle: **Auth → Policies / Password settings** in the Supabase dashboard. No code.
Ref: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### 2. Stop the `backgrounds` storage bucket from allowing file listing
The public `backgrounds` bucket has a broad SELECT policy (`Public read access for backgrounds`) on `storage.objects` that lets any client *list* every file in the bucket — i.e. enumerate other users' uploaded background photos. Public object URLs keep working without this; listing is not needed for `<img src>` access.
Fix: drop/replace the broad SELECT-list policy so individual objects are still readable by URL but the bucket can't be enumerated. If feasible, scope object paths per user (`{user_id}/...`) and gate SELECT on the path prefix.
Ref: https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing

## Do now while data is small (performance, mechanical)

### 3. Wrap `auth.uid()` in a subselect in every `own X` RLS policy
14 policies (motions, swells, groups, logs, wave_checkins, user_settings, motion_swells, milestones, milestone_hits, chapters, reflections, and the rest) call `auth.uid()` directly, so Postgres re-evaluates it per row. Replacing `auth.uid()` with `(select auth.uid())` makes it evaluate once per query. Purely mechanical policy redefinition; trivial to apply now, and it compounds as data grows. Do all of them in one migration.
Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

### 4. Add covering indexes on the `chapter_id` foreign keys
Six FKs lack a covering index: `groups`, `logs`, `motions`, `reflections`, `swells`, `wave_checkins` (each `*_chapter_id_fkey`). The existing composite `(user_id, chapter_id)` indexes serve the app's normal reads (which filter on both), but a standalone `chapter_id` index speeds up the ON DELETE CASCADE when a chapter is archived/deleted. Low urgency at current scale; cheap to add. One migration: `CREATE INDEX ... ON <table> (chapter_id);` for each.
Ref: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Explicitly leave alone

- **`contact_submissions` and `waitlist` "always true" INSERT policies** — flagged as overly permissive, but intentional: both are public, anon-writable forms. Leave as-is. (Optional future hardening: a length cap or basic rate limit to deter spam inserts. Not needed for launch. Note `waitlist` is currently orphaned — `joinWaitlist` isn't called anywhere — so it takes no writes today regardless.)
- **The 5 "unused index" warnings** (`milestones_motion_id_idx`, `swells_hidden_idx`, `groups_user_chapter_idx`, `wave_checkins_user_chapter_idx`, `user_settings_stripe_customer_idx`) — "unused" only because there's little data and traffic so far. These match real query paths that will fire once testers arrive. **Do not drop them.**

## Not covered by the advisors — worth one manual check

The advisors confirm RLS and indexes but do not verify CHECK constraints, FK `ON DELETE` behavior, or drift between `supabase-migration.sql` and live prod (you hit a partial-migration gap once during Anchors-E). Worth a quick diff of the canonical migration file against the live schema, and a spot-check that the `intensity` / `milestones.kind` CHECKs and the `chapter_id` CASCADE deletes are actually present in prod.
