# Anchors + Journal v2

*Drafted in brainstorm session, 2026-05-31. Implementation in Claude Code.*

## Why

Three issues surfaced in testing:

1. `/anchors/journal` is functionally hidden. Entry point was removed in the 2026-05-21 polish batch and nothing replaced it.
2. The `/anchors` page leads with "Recent" (last 10 motion logs), which duplicates what the dashboard already gives. The anchor log itself, the actual user-authored markers, is buried.
3. Free-anchor creation is gated behind the engagement-floor unlock. Free anchors are just journaling and don't need the cycle-close machinery to be meaningful. Gatekeeping journaling for the first week reads as arbitrary.

This spec also reframes the journal from "anchor library" to "weekly archive of your life in Onduler." Every week since the user's first event renders as a row, regardless of whether they dropped anchors in it. Gaps become legible too, which fits the witness-not-coach posture.

## Scope

This session ships:

- Locked `/anchors` gets a quiet `+` in the top-right (no other header chrome).
- Free anchor creation works from day 1 (drop the unlock gate on `/anchors/new`).
- The "Recent" section on `/anchors` is replaced by an inline anchor log.
- The journal becomes a weekly archive: every week from the first event renders as a row, collapsed by default, with "Expand all" available.
- Cycle chip picker added to `/anchors/new` (matching the existing edit form).
- Ceremony anchor text becomes editable (expectation / observation only; cycle window stays frozen, radar stays re-aggregated).
- Wave detection updated to count anchors as engagement.
- Journal gets a `+` in the header matching `/anchors`.
- Locked page hint card rewritten to acknowledge `+`.

## Surface changes

### Locked `/anchors`

The locked page currently has no header. Full-bleed vibe surface (wave field + breathing wake + hint card + "every motion leaves a wake.")

Add a single quiet `+` in the top-right corner only. No kicker, no border, no background. Low opacity (`text-th-faint` or lower) so it reads as available without breaking the mystery posture. Tap routes to `/anchors/new`. Same `aria-label="Drop an anchor"`.

After save, user lands back on `/anchors` (still locked) with a brief global toast: **"Anchor dropped"**.

Update the locked hint card copy:

> The page unlocks after your first week. You can drop an anchor anytime.

Replaces the current "Nothing to do yet. Just keep logging." which contradicts the new `+`.

### Unlocked `/anchors`

Replace the **Recent** section (last 10 motion logs) with an **inline anchor log**:

- Period-filtered (respects the existing week / month / quarter / year selector).
- Shows the user's anchors in the selected period, newest first.
- 10 per page. "Load more" reveals the next 10. Continues to full history within the period.
- Empty state when no anchors in the period: *"No anchors this week. Drop one →"* (link to `/anchors/new`).
- Tap a row to expand inline.

Expanded row, **free anchor**:

- Prompt text (if present, italic, read-only).
- Body text rendered as an editable `<textarea>`. Save on blur. Empty save shows a quiet error and keeps the previous value.
- Cycle chip below the body (display only; cycle edit lives on the `/anchors/[id]/edit` page since it's a less-common action).
- Two-tap delete control in the corner (matches existing pattern).

Expanded row, **ceremony anchor**:

- Cycle window label (e.g., "Week of May 17", read-only, this is the frozen part).
- Expectation text as an editable `<textarea>` (label: "Expected"). Save on blur. Empty allowed.
- Observation text as an editable `<textarea>` (label: "Observed"). Save on blur. Empty allowed.
- Quiet link: *"See frozen radar in journal →"* (the inline log does not render FrozenRadar; it lives on the journal).

Below the list, after all 10-load-more pages are exhausted (or always visible at the bottom), a quiet:

> See all in your journal →

Routes to `/anchors/journal`.

### Journal `/anchors/journal`

The journal becomes a weekly archive. Hierarchy:

```
Your anchors                                    [+]   <- new header `+`
[short subtitle, e.g. "Every week of your life in Onduler."]
[Expand all]                                          <- top-right link, toggles to "Collapse all"

Chapter [date range]
  Week of May 24 ›
  Week of May 17 ›
  Week of May 10 ›
  ...

Chapter [earlier date range]
  Week of Apr 27 ›
  ...
```

Collapsed week row: just the date. No counts, no glyphs. Clean list.

Expanded week row, based on what the week contains:

- **Has anchors** (free or ceremony): renders the anchor cards as the current journal does (free anchors as Link to edit page, ceremony anchors with `FrozenRadar` re-aggregated from current logs scoped to that chapter, same `CeremonyCard` pattern as today).
- **Has motion logs but no anchors**: renders the wake for that week (FrozenRadar with that week's actuals, no anchor text). No caption needed.
- **No logs AND no anchors (wave week)**: thin horizontal `WaveField` strip + small label "Wave week". No other text.

Chapters render as section headers (not collapsible in v1). Weeks render newest at top within each chapter, chapters newest at top within the page (same as today).

Week boundaries follow the existing Sun-Sat rule. The Sun-Sat that contains a chapter's start is week 1 of that chapter, even if partial.

Render every week from the **first event** (first log or first anchor in the chapter, whichever is earlier) through the current week (or the chapter end, for archived chapters). Pre-event weeks are never rendered; an account that signed up 3 weeks ago and just dropped its first anchor today shows only the week containing today, not 3 leading wave-weeks.

Add `+` in the top-right header matching `/anchors` (same component, same href).

### `/anchors/new`

Add a cycle chip picker matching the existing `/anchors/[id]/edit` form: **This week / Last week / No cycle**.

Hide the "Last week" chip when the user's chapter started in the current week (no prior week exists yet in this chapter).

Default selection stays "This week" (current behavior). Hidden inputs continue to drive `cycle_start` / `cycle_end` server-side.

Drop the unlock gate. The route already works regardless of unlock state, but `/anchors` redirects to a different surface when locked, which makes `+` on the locked page necessary for reachability (covered above).

## Wave detection update

Currently `/anchors/page.tsx` and `/dashboard` detect a wave by checking only the `logs` table (72+ hours since last log, no wave_checkin after). Update both to also check the `reflections` table.

New rule for active wave state:

> User is on a wave if 72+ hours have passed since the most recent `logs.logged_at` OR `reflections.created_at`, whichever is more recent, and no `wave_checkins` row was inserted after that timestamp.

This means a user who journals every other day without logging motions is not flagged as being on a wave. Anchors count as engagement.

New rule for the journal's wave-week label:

> A week is a wave week if zero `logs` exist in the Sun-Sat window AND zero `reflections` rows exist with `created_at` inside the window.

Strict zero on both signals.

## Server action changes

`updateFreeAnchor` becomes `updateAnchor` (rename, or split into a new action). Currently it rejects `cycle_type !== 'free'`. New behavior:

- Free anchors: editable as today (body_text, prompt_text, cycle_start, cycle_end).
- Ceremony anchors: editable only `expectation_text` and `observation_text`. `cycle_type`, `cycle_start`, `cycle_end`, `did_tune` stay frozen.
- All edits gated to anchors owned by the requesting user.

`deleteFreeAnchor` keeps its current behavior. Ceremony anchors remain non-deletable.

If renaming the action, sweep the two callers in `app/anchors/[id]/edit/EditAnchorForm.tsx`.

## File touch points

Likely files to edit (verify when implementing):

- `app/anchors/page.tsx`: replace Recent section with inline anchor log component, add `+` to locked page render, drop wake-section "Waves" if it becomes redundant (decide while implementing, not pre-deciding).
- `app/anchors/components/LockedPage.tsx`: add `+` link top-right.
- `app/anchors/components/InlineAnchorLog.tsx`: new client component. Period-filtered list, 10-per-page paging, expand/collapse, inline edit textareas with save-on-blur.
- `app/anchors/new/NewAnchorForm.tsx`: add chip picker, hide Last week when no prior week.
- `app/anchors/new/page.tsx`: pass chapterStart so the form knows when to hide Last week.
- `app/anchors/journal/page.tsx`: rewrite around week buckets. Compute week list from first-event through current week.
- `app/anchors/journal/WeekSection.tsx`: new client component holding expand state per week and broadcasting to Expand all.
- `app/anchors/journal/JournalHeader.tsx` or inline: add `+` and "Expand all" toggle.
- `app/actions/reflections.ts`: update `updateFreeAnchor` to accept ceremony edits; update wave detection helpers if any live here.
- Wave detection: wherever the 72hr check happens (`app/anchors/page.tsx`, dashboard wave-check helper) update to consider anchors.

## Edge cases to handle

- Chapter started this week, user on `/anchors/new`: hide Last week chip.
- Ceremony anchor inline edit with empty text fields: allowed. The user might want to clear what they wrote.
- Inline log with 0 anchors in the period: empty state with the "Drop one →" link.
- Locked page `+` over the wave field: must not break the breathing wake animation; place outside the wake's centered column.
- Toast on save from locked page: confirm the global Toast infrastructure works on the locked page (it should, it wraps the root layout).
- Journal page on day 1 of a brand new account who just dropped their first anchor: renders one chapter, one week, expanded shows the anchor card.
- Journal page where user has logs but no anchors: renders weeks with wake-only (no anchor text). This is the "I just track" mode and should look fine.

## Deferred (record now, don't build this session)

**Manual wave-on toggle.** No current way for a user to declare a wave explicitly; they wait for the rolling 3-day threshold to fire. Add a "Start a wave" affordance in Settings → Tracking. Behavior: writes a wave_checkin-style record that suppresses the daily checklist and ceremony banners until cleared. Probably also pauses the wake on the locked/unlocked anchors page. Spec separately.

**Journal page render performance at scale.** For a user one year into Onduler, the journal renders ~52 week sections, each with potentially an SVG radar in the DOM (hidden by collapse). Manageable for now (year-one users are the visible horizon). Switch to lazy expansion (server fetch per week on tap) when this gets slow. No work this session.

**Chapter section collapse in journal.** Currently chapters are non-collapsible spines. If users archive several chapters with many weeks each, the page could grow. Worth revisiting if it becomes a problem.

**Edit affordance on ceremony cycle window.** The cycle for a ceremony anchor stays frozen this session. If a user wants to "re-anchor against a different week" they would drop a free anchor instead. Not exposing this avoids re-litigating what the ceremony was about.

## Notes on voice

- Toast copy: **"Anchor dropped"** (matches your vocabulary).
- Empty state on inline log: **"No anchors this week. Drop one →"**
- Locked page hint card: **"The page unlocks after your first week. You can drop an anchor anytime."**
- Journal subtitle: leave as is or replace with something that matches the new framing. Current: "Every anchor you've dropped, oldest chapters at the bottom." New (suggested): "Every week of your life in Onduler, oldest chapters at the bottom."
- Wave-week label in expanded view: **"Wave week"** below the WaveField strip.
- No em dashes anywhere in new copy.

## Open questions for implementation

These can be decided in-session by Claude Code if reasonable defaults exist. Flag if the user input is needed:

1. Does the most-recent week default expanded in the journal, or do all weeks default collapsed and rely on Expand all? (Defaulting most-recent expanded reduces the tap cost on the most common read.)
2. Does "Expand all" persist in localStorage so the user's preference sticks across visits?
3. Inline log empty state when on a non-week period (month / quarter / year): does the copy adapt? ("No anchors this month. Drop one →")
4. Does the inline log on `/anchors` show period total count alongside the section heading ("Anchors · 3") or just the heading? Leaning just the heading, but flagging.
