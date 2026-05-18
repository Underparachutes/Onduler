# 0005 — Calendar-month monthly cycle, wave month criteria, and ceil display rule

**Status:** Accepted
**Date:** 2026-05-18

## Decision

The Log page and proficiency view gain a calendar-month view alongside the existing weekly view. Monthly targets are derived from weekly targets at render time, never stored. Wave-month wash triggers on a seven-day consecutive zero-log streak inside the calendar month. All numbers that reach the screen are rounded up to whole units; internal radar geometry uses unrounded floats so vertices land in the right pixel.

The decision covers seven interlocking pieces:

### 1. Calendar-month anchor

Monthly views anchor to the calendar month, first-of-month reset. "This month" means 1st-of-month-to-today; "last month" is the previous calendar month in full. The Sunday-anchored weekly cycle is unchanged; the monthly cycle runs independently alongside it.

The Log page's period filter changes:

- Old labels: `7 days · 30 days · All time`
- New labels: `This week · This month · All time`

The proficiency view's time-view toggle changes correspondingly:

- Old: `Week · Month · Lifetime`, where Month meant "last 4 weekly bars stacked or summed."
- New: `Week · Month · Lifetime`, where Month means the calendar month (1st-of-month to today, or full calendar month in last-month view).

PROJECT.md "Current state of the build" entry for the proficiency view (the line referencing "last 4 weekly bars stacked or summed") updates to reflect calendar-month math.

### 2. Monthly target math

Monthly target is never stored. Computed at render time:

```
monthly_target = ceil(weekly_target × days_in_month / 7)
```

Where `days_in_month` is the number of days in the current calendar month (28, 29, 30, or 31). The same weekly target produces different monthly displays depending on month length — that's correct, not a bug. The cost of calendar accuracy.

Lifetime target follows the same pattern:

```
lifetime_target = ceil(weekly_target × weeks_since_first_log)
```

Where `weeks_since_first_log = ceil(days_since_first_log / 7)` across all of the user's motions. Lifetime target re-derives every render.

### 3. Wave month criteria

A month is a wave month iff there exists a run of **seven or more consecutive days** inside that month with zero logs across all motions. Six-day gaps do not trigger the wash. Wave detection runs server-side as part of the existing wave-aware data fetch — extending the helper that already detects active waves for the weekly view.

Concretely, the helper returns (per month-window):

```
wave_month_streak: number   // longest consecutive zero-log streak in the month, in days
wave_month_active: boolean  // wave_month_streak >= 7
```

The radar component uses `wave_month_active` to gate the wave-wash + softened ring on the monthly view.

The seven-day rule has a designed side effect: a user who logs even one motion every Sunday-to-Saturday window will never trigger wave month, no matter how thin the rest of each week. That's the gentle "check in weekly and you're fine" nudge built into the math, not enforcement.

**Lifetime view does not get a wave-wash.** Over long enough windows, washing loses meaning.

### 4. Symmetric drag editability

Weekly target remains the source of truth (integer pts, or quarter-hour increments for hours mode). Drag on either view edits the underlying weekly target:

- **Drag on weekly view:** edits weekly directly, snapped to the weekly step (default 5 pts or 0.5 hrs).
- **Drag on monthly view:** edits the underlying weekly target, snapped so that each step on the monthly view corresponds to one weekly step. Effective monthly step at any moment is `ceil(weekly_step × days_in_month / 7)`. The live pill shows the new monthly value as the user drags, with the new weekly value as small secondary text.
- **Drag on lifetime view:** disabled. Lifetime is a recognition surface, not a tuning surface. Handles render as static dots (no hover, no cursor change).

The reset-to-build chip still seeds weekly targets only, regardless of which view is active. On the monthly view, the diff-confirm dialog shows the monthly values for clarity, with weekly equivalents in parentheses.

### 5. Live pill format

On the monthly view, the live drag pill shows both values:

```
{swell_name} · {monthly_target_ceil} {currency}/mo · {weekly_target} {currency}/wk
```

Example: `Mind · 222 pts/mo · 50 pts/wk`. Keeps the source-of-truth weekly value visible while the user is in the monthly mental model. Prevents the "wait did I just change two targets" confusion.

On the weekly view, pill stays as before: `Mind · 50 pts/wk`.

On the lifetime view, no drag, so no pill.

### 6. Ceil display rule

Every number that reaches the screen is `ceil`'d. Targets, actuals, ratios, percentages — all integer-displayed. Underlying state stays precise; only the display rounds. The radar's polygon geometry uses unrounded floats so vertices land in the right pixel.

Rationale: precision under the hood is mathematically honest; decimal-free display is calmer to read and matches Onduler's surf-leaning aesthetic. `ceil` rather than `round` because (a) displaying a target slightly higher than the true float is closer to "what you actually need to hit," and (b) displaying actuals slightly higher is a small celebration bias that aligns with Onduler's celebration-over-judgment posture.

This rule applies app-wide — Log page, proficiency view, swells page weekly aggregate, motion detail sheet stats. Adopt it everywhere or it leaks.

### 7. Across-app rollout

This decision touches three surfaces:

- **Log page:** period filter labels change; radar component accepts a `period` prop and routes to weekly/monthly/lifetime data; wave-wash logic uses `wave_month_active` on monthly view.
- **Proficiency view:** time-view toggle's Month tab switches from "last 4 weekly bars" to calendar-month math, using the same helpers.
- **Settings build picker:** unaffected; build presets seed weekly targets, monthly displays compute from weekly.

## Why

**Calendar months match how users think about time.** "Past 30 days" is a rolling window with no anchor. "This month" is a unit users already organize their lives around — paychecks, rent, calendar events. The Sunday-anchored weekly cycle works for the same reason. Onduler's celebration mechanic lives on the weekly anchor; the monthly view is purely diagnostic, but it should still anchor to the unit users live in.

**Wave month via consecutive-zero-day streak is the right shape.** Wave week is triggered by even one wave day, which makes sense for a short window: a single wave day in a 7-day window meaningfully changes the user's state. A single wave day in a 30-day window doesn't — the rest of the month carries plenty of signal. The seven-day-consecutive rule scales the wave threshold to the window's length while also creating a gentle weekly check-in nudge as a side effect.

**Precision under the hood, rounded display, is honest both ways.** Storing weekly as integer and computing monthly with calendar-accurate math means the source of truth is clean and the diagnostic math is correct. The `ceil` display rule means users see whole numbers without decimals leaking through. The combination — exact internal, rounded external — avoids both the "ugly fractional pts" UX and the "your numbers don't add up" math complaint.

**Symmetric drag editability preserves intuition without splitting state.** A user looking at the monthly view should be able to drag the monthly value directly; that's how editing should feel. Underneath, the weekly target is what changes, because that's the celebration anchor. The live pill shows both values so the user sees the relationship. No second target column, no schema growth.

## Alternatives considered and rejected

**Rolling 30-day window instead of calendar month.** Rejected. Rolling windows don't anchor to anything users recognize. The diagnostic value of "look at May" is in seeing a complete chapter, not the last 30 days from a movable boundary.

**4-week constant target (`weekly × 4`, fixed).** Rejected. Clean math but small over-credit in 30- and 31-day months. More importantly, doesn't match the "this month" framing — users see "this month" but the comparison target represents "4 weeks." Mismatch breeds confusion.

**Store monthly target as a separate column.** Rejected. Two source-of-truth columns invite drift. The weekly target drives celebration; the monthly target is a derived view. Computing on render keeps the data model lean.

**`round` instead of `ceil` for display.** Rejected. Round-half-up and round-half-even produce different results across runtimes and look inconsistent at boundaries. `ceil` is monotonic and rule-of-thumb (always slightly conservative). The small upward bias matches Onduler's celebration-leaning posture.

**Hide decimals only on the radar chart, leave them in stat cards.** Rejected. Inconsistent. The whole point is "users don't see decimals." Apply the rule everywhere or it leaks somewhere weird.

**Pace-adjusted monthly target ("you should be at 50% by mid-month").** Rejected. Sneaky-judgmental. Show the full monthly target; let users read their own progress against it.

**Wave-month threshold of 5 days, 10 days, etc.** Considered. Seven has the cleanest narrative property — a full week of not showing up. Other thresholds work mathematically but don't carry the "miss one week" mental model.

**Editable lifetime view.** Rejected. Lifetime is the recognition surface. Letting users drag it conflates "what I'm aiming for" with "what I've already done." Read-only is the right posture.

## Schema

No new tables, no new columns. Existing schema covers everything:

- `swells.target_points`, `swells.target_hours` — already weekly. No change.
- `logs.logged_at` — drives all period aggregation.
- `wave_checkins` — drives wave-week detection; doesn't drive wave-month (which is computed from zero-log streaks).
- `user_settings.tracking_mode` — currency in pill and labels.

If anything in the build feels like it wants a new column, surface it before adding — the spec assumes we ride existing schema.

## Implications

- **Next session after the current radar polygon/wedge refactor:** Calendar-month view rollout. Adds `period` prop to the radar, threads it to the existing parallelized data fetch, extends wave-detection helper for wave-month, updates Log page filter labels and proficiency view Month tab.
- **Pair fix that rides along:** the existing "lifetime in week one shows absolute total instead of ratio" pair-fix from the radar-spec roadmap row. Same period-aware helpers; lands cleanly in this session.
- **PROJECT.md changes:**
  - Working agreements: add a line for the ceil display rule, similar to the count-based pluralization rule.
  - Decisions section: add a summary entry for ADR 0005.
  - Roadmap: insert this session after the current radar-refactor session.
  - State of the build: update the proficiency view line that currently describes the Month tab as "last 4 weekly bars stacked or summed."
- **Shared helper:** `lib/periods.ts` (or extension of `lib/radar.ts`) holds the pure functions: `daysInMonth(date) → number`, `weeksSinceFirstLog(date, first_log_date) → number`, `consecutiveZeroDayStreak(logs, window_start, window_end) → number`, `monthlyTargetDisplay(weekly_target, date) → number`, etc. Both the radar and the proficiency view consume from here.
- **Existing Log page filter buttons:** rename "7 days" → "This week", "30 days" → "This month", "All time" stays. Underlying period semantics shift from rolling to anchored. Acceptable since one user and minimal data — no migration path needed.

## Origin

Decision reached in a Cowork design session on 2026-05-18, immediately following the Logs radar polygon and wedge-geometry work. Started from Josh's observation that the existing chart on the Log page doesn't respond to the period filter below it, even though the list below does. Working through the implications surfaced the cycle-anchor question (rolling vs calendar), the target-math question (4-week vs calendar-accurate), the wave-month criteria question, and the precision-vs-display question. The seven-day-consecutive wave-month rule was Josh's proposal; the ceil-everywhere display rule was a refinement of the same call.
