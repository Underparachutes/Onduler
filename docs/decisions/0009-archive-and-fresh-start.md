# ADR 0009: Archive-and-fresh-start (chapter_id FK on entity tables)

*2026-05-21*

## Context

ADR 0007 introduced `chapters` and `reflections` as first-class tables so the
Anchors surface could carry a notion of "this period of your life vs. an
earlier one." Reflections were chapter-scoped at the column level. Everything
else — motions, swells, groups, logs, wave_checkins — was implicitly
single-chapter because the schema had no concept of multiple chapters in
flight; existing data was backfilled to a single Chapter 1.

Anchors E (the implementation session for archive-and-fresh-start, per the
PROJECT.md roadmap) needs to flip that: a user can finish a cycle-close
ceremony, choose to start a new chapter, and find themselves in a clean app —
new shape, new swells, new motions — without losing their archived data.
ADR 0007 listed this schema scoping as an open question to settle at session
start.

## Decision

**Approach (a): `chapter_id` (NOT NULL FK) on the entity tables.**

Five tables gain a `chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE
CASCADE` column:

- `motions`
- `swells`
- `groups`
- `logs`
- `wave_checkins`

Others inherit by transitive ownership:

- `motion_swells` via the motion's `chapter_id`
- `milestones` via the swell's `chapter_id`
- `milestone_hits` via the milestone's chapter
- `reflections` already carries `chapter_id` (ADR 0007)

Composite indexes `(user_id, chapter_id)` exist on all five tables so the
active-chapter filter is a cheap scan. `(user_id, chapter_id, logged_at DESC)`
on `logs` keeps the active surfaces' temporal ordering fast.

Active app queries scope all reads to the active chapter via a single helper
(`lib/chapters.ts` → `getActiveChapterId(supabase, userId)`) that returns the
user's active chapter id and lazily creates one if missing — handles the
new-signup case before any data exists. Every entity insert sets `chapter_id`
to the active chapter id.

## Why not snapshot-to-JSON

The alternative — serialize the active chapter's entity rows to a `chapters.
archive_blob jsonb` column on archive, then DELETE the rows — was rejected:

- **Reckless on archive.** A DELETE of every row in five tables, gated on a
  JSON serialization that has to be perfect the first time. No recovery if
  the blob is wrong.
- **Locks out cross-chapter analytics.** Future features that compare past
  chapters to the current one (or surface "you used to log Yoga, do you
  want it back?") become JSON parsing instead of joins.
- **Past-chapter browse becomes inert.** The Settings → Past chapters
  surface (deferred to a follow-up session) needs structural access to
  archived motions/swells/logs. With JSON, every read is a parse. With
  `chapter_id`, it's a one-line filter swap.
- **Schema migrations get harder.** A new column on `swells` later means
  every past archive blob is now out of date, and either gets a migration
  pass or silently lacks the column. Native columns just are.

The cost of (a) is the sweep: every read/write of the entity tables (~86
queries across 19 files in the existing codebase) had to add the
`chapter_id` filter. That's a one-time cost; (b)'s costs compound.

## What stays per-user (not per-chapter)

`user_settings` is per-user, not per-chapter. Tracking mode, theme, daily
goal, haptics, celebration, daily goal hours — these are the user's
preferences and survive the chapter change. The archive flow does reset:

- `onboarding_complete` → false (user re-onboards into the new chapter)
- `primary_build` / `secondary_build` → null (re-pick a shape)
- `mvs_motions` → null (no still-showing-up motions yet in the new chapter)
- `welcome_back_mode` / `welcome_back_started_at` → null

## Archive flow

A "Start a new chapter" button sits on the CycleCeremony tune step (third
option, below Swells / Motions / Skip). Tapping it routes to an in-flow
confirm step ("Close this chapter?") with a soft warning explaining that
archived data is preserved but the active app starts fresh. Confirming runs
the `archiveAndStartFreshChapter` server action, which:

1. Saves the current ceremony reflection (so the user gets credit for
   completing the ceremony).
2. Sets `ended_at = now()` on the active chapter.
3. Inserts a new chapter with `started_at = now()` and `sort_order = prev + 1`.
4. Resets the user_settings fields listed above.
5. Revalidates the entire route tree so the new (empty) chapter renders.

The user is then routed to `/onboarding`. The chapters_one_active_per_user
unique partial index guarantees only one active chapter — double-clicks and
race conditions are no-ops.

## Past-chapter browse

Settings → Past chapters is deferred to a follow-up session. With the
schema in place, the implementation is small: list chapters where
`ended_at IS NOT NULL`, then per-chapter views just swap the active
chapter id for the archived one. Read-only by convention (no UI exposes
mutation on archived data; RLS still protects ownership).

## Migration

A single SQL script (`scripts/migrate-anchors-e-chapter-fk.sql`) runs in
the Supabase SQL Editor:

1. Ensure every user with data has an active chapter (safety net for
   anyone signed up post-ADR-0007-backfill).
2. Add `chapter_id` as a nullable column.
3. Backfill: each row's `chapter_id` = the user's active chapter.
4. Lock the column `NOT NULL`.
5. Create composite `(user_id, chapter_id)` indexes.

Wrapped in `BEGIN; ... COMMIT;` so a failure rolls back cleanly. The full
schema file `supabase-migration.sql` is updated to reflect the new shape
(chapters now sits at the top so the entity tables can reference it).
