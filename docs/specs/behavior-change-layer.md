# Onduler: Behavior Change Layer Spec (v1)

**Date:** 2026-06-01
**Status:** Designed, not yet built. Targets the v1 testing window, post Anchors + Journal v2.

## The core insight

Onduler's design language (witness, not coach) leaves a real question unanswered: if the product never tells the user what to do, what is doing the work of actually changing behavior?

The honest answer is that three mechanisms have to live somewhere in the product:

1. **Cue-action pairing.** Habits don't form from intention alone. They form when an action gets anchored to an existing daily trigger.
2. **Reflection and forward intent.** Logging without noticing doesn't change anyone. The user has to see the data and say something about what they want next.
3. **Expression of effort.** The same motion done lightly and done deeply are different acts. Collapsing them to one point value flattens the signal the user is trying to read about themselves.

None of these require Onduler to start coaching. Each can be carried by user-authored content the product simply holds. This spec covers five moves that strengthen those three mechanisms while staying inside the witness posture.

## What this spec is reacting to

A working-session conversation on 2026-06-01 where five behavior-change candidates were proposed and pressure-tested. Two were rejected as they would have felt false in daily use (motion-level cue field, motion-level "why" field). The remaining three are below, plus two adjacent moves the conversation surfaced.

## What's explicitly off the table

These were considered and discarded, in this conversation, for the reasons listed. Recording them so future sessions don't re-propose:

- **Per-motion cue field** (*"When?"*, *"After what?"*). Optional-but-visible fields accumulate as failed promises. Completionist users fill them and then feel false when the cue doesn't fire. The cue actually lives in the user's day, not in the app. Pairing happens via buckets per Move 1.
- **Per-motion "why this matters" field.** Conflates with what swells and waypoints already carry. The reason a motion exists is captured by the swell it feeds and the waypoint it advances toward.

## The six moves

### 1. Buckets as cue-pairing surface

**Problem.** Habit formation research (Fogg, Clear) is consistent that new actions stick when anchored to existing routines. Onduler currently has no surface where this pairing happens. Adding one as a motion field was rejected (see above).

**The move.** Reframe the existing **buckets** feature, in copy only, as the surface where the user clusters motions by daily context. No schema change, no new UI. The bucket *is* the cue. A "Morning" bucket containing Coffee, Stretch, and Meditate is itself an implementation intention written in three motions.

**Copy changes.**

- Bucket creation form hint, currently: *(present text)*. Replace with: *"Buckets are how your motions cluster in your day. Name them by context (Morning, Evening, At work, Saturday) so each motion lives near the ones it actually happens beside."*
- Empty state on Settings → Buckets when no buckets exist: *"Group motions by when they happen. Morning, Evening, At work. The cluster is the cue."*
- Two seed example bucket names in the empty state, tappable to pre-fill: *"Morning rituals"*, *"Wind down"*. Both clearable.

**Why it's brand-consistent.** The user names the bucket. The user picks the motions in it. Onduler holds the cluster. No nudge, no recommendation, no coaching. Just a surface where the user's own routine becomes visible to themselves.

**Acceptance check.** A new user reading the bucket creation hint says "oh, buckets are for grouping by time of day" rather than "buckets are folders." Existing testers with no buckets create at least one within a week of the copy change.

**Files touched.** Settings → Buckets form copy, empty state. Probably `app/settings/components/SettingsPanel.tsx` or wherever bucket form lives. No schema, no migration.

---

### 2. Closing-ceremony second prompt

**Problem.** The Anchors weekly ceremony asks *"What did you expect to see?"* and *"What did you see?"* but has no forward-facing prompt. Reflection without forward intent is observation, not change. Users who close the ceremony with a clear sense of what they saw still leave with no expressed wish about what they want next.

**The move.** Add a third optional text prompt at the end of the existing ceremony flow: *"What do you want to see next week?"*. Skippable like the other two. Saves to a new column on `reflections`. The next week's ceremony, when fired, can use this text as the implicit *"What did you expect?"* answer (pre-fill or quiet reference, exact treatment TBD in build).

**Ceremony flow becomes.**

1. *"What did you expect to see this week?"* (existing, optional)
2. Frozen radar reveal (existing)
3. *"What did you see?"* (existing, optional)
4. *"What do you want to see next week?"* (new, optional)
5. *"Want to tune something?"* CTA stack (existing)

**Schema.** Add `reflections.intention_text text NULL`. No backfill needed. Reuses `reflections` table that already supports ceremony entries. Pacific timezone, chapter-scoped (matches the rest of the reflections shape).

**Next-week pre-fill (confirmed).** On the next week's ceremony, if the prior week's reflection has a non-null `intention_text`, that text becomes the **placeholder text** for the *"What did you expect to see this week?"* input. The user can accept (leave it) or replace (type over it). On submit, an unedited placeholder is saved as the expectation; a cleared field saves null (still skippable). This closes the loop so the user sees their own forward statement become the prior expectation, without Onduler making the connection out loud. Pure mirror.

**Why it's brand-consistent.** Skippable. User-authored. Pure mirror when the prior week's text resurfaces. Pairs with the existing celebration-over-judgment posture by closing the loop on the user's own forward statement.

**Acceptance check.** At least one tester writes intention text on a weekly ceremony close. The cadence extension to month/quarter/year is automatic since they share the `CycleCeremony` component (ADR 0007, Anchors F).

**Files touched.**

- `app/anchors/ceremony/[cadence]/CycleCeremony.tsx`: add fourth step with the intention prompt.
- `app/actions/anchors.ts` (or `reflections.ts`): `saveReflection` accepts `intention_text`.
- `scripts/migrate-intention-text.sql`: idempotent column add.
- `supabase-migration.sql`: canonical schema update.

---

### 3. Lower-friction logging (PWA today; native deferred)

**Problem.** Habit research is consistent that friction at the moment of action is the single strongest predictor of whether a habit forms. The PWA already removes the install-from-store friction. The next layer of friction is *opening the app at all* when the cue fires.

**Native solutions (lock-screen widget, Siri Shortcut via App Intents, Apple Watch complication, push notifications) all require shipping a native iOS app or thin wrapper.** This is real work, not a port. Confirmed not to attempt half-measures inside the PWA. Native shell becomes its own future phase. Logged here so it's not lost.

**The move (PWA-today scope).** Two friction reductions that fit inside the existing web app:

- **Dashboard quick-log surface.** When the user opens the app, the highest-priority interaction is logging today's motions. The current Motions page already does this well. Confirm in the build session that nothing structural is in the way (e.g., the dashboard shape and any banner content doesn't push the first motion row below the fold on common phone sizes). If it does, fix that first.
- **iOS Share Sheet target (investigation, not commitment).** Investigate whether the PWA can register as a Share Sheet recipient so users can share-to-Onduler from other apps to log. Likely partial or impossible inside iOS PWA constraints. Time-box the investigation at 30 minutes. If it works, ship it. If it doesn't, document the limitation and move on.

**Why it's brand-consistent.** Pure friction reduction. No coaching, no notification, no nudge. The user already wants to log; the product just gets out of the way faster.

**Acceptance check.** First motion row sits above the fold on iPhone 14/15 standard (390×844px) viewport at any nav state.

**Deferred to native shell phase** (queue in PROJECT.md as a roadmap row, not a session item yet):

- iOS lock-screen widget (WidgetKit, Swift).
- Apple Watch complication and quick-log glance.
- Siri Shortcut via App Intents framework.
- Push notification infrastructure (paired with Move 4 below).

Native shell choice (Capacitor wrapper vs full React Native rewrite vs native shell with WebView) is a decision for the native phase, not this spec.

---

### 4. User-authored reminders (deferred to native phase)

**Problem.** Even with frictionless logging, users who never reflect won't change. Reflection is the surface where behavior change actually compounds. If the user never opens the app on Sunday, the weekly ceremony never fires, and the strategic layer doesn't do its work.

**Design intent (not buildable yet).** When push notifications ship (native phase), they will be:

- **Always user-authored.** The user, in Settings, chooses which nudges to receive. Defaults are all off.
- **Cover both motions and ceremonies.** Not just "remember to log meditate" but also "Sunday morning: your weekly anchor is ready." The ceremony nudge is the more important of the two.
- **Onboarding offer (decided).** The Sunday ceremony nudge opt-in lives **in onboarding**, not after the first unlock. Reasoning: catching users when they are already deciding what kind of relationship to have with the app is higher leverage than catching them a week later when most won't be back. Open question logged below: the user hasn't experienced a ceremony yet at onboarding, so the offer needs one or two sentences of context (*"At the end of each week, Onduler shows you what you logged so you can notice it. Want a gentle Sunday nudge so you don't miss it?"*) rather than assuming they know what they are opting into. Default is off; explicit tap to enable.
- **Witness voice.** Notification copy never tells the user what they should have done. Sample acceptable copy: *"Sunday. Your week is ready to be seen."* Sample rejected copy: *"You haven't logged in 4 days."*

**Schema sketch (for the native phase).** `user_settings.reminder_prefs jsonb` shape probably `{ ceremony_weekly: bool, ceremony_monthly: bool, ..., motion_<id>: { time: "HH:MM", days: [...] } }`. Native code reads this and schedules local notifications. No server push needed for v1.

**Why it's brand-consistent.** User picks the cadence, the content, the timing. Onduler is the messenger of the user's own intent, not its own opinion.

**Acceptance check (when built).** A tester who opted in to the Sunday ceremony nudge receives it and completes a weekly ceremony they otherwise would have missed.

---

### 5. Light / medium / deep on log

**Problem.** A 5-minute meditation and a 45-minute meditation log identically. A walk to the mailbox and a 10-mile hike log identically. The user knows the difference and the product can't see it. Solving this with per-motion point inflation makes the user's average drift unnaturally; solving it with hours mode forces every user into honest accounting whether they want it or not.

**The move.** Restore the v1-prototype pattern: each log carries an **intensity** (light / medium / deep), with a points multiplier applied at log time:

| Intensity | Multiplier | Default tap |
|---|---|---|
| Light | 0.5× | long-press → pick |
| Medium | 1.0× | single tap (default, today's behavior) |
| Deep | 1.5× | long-press → pick |

**Interaction model.** Single tap on the motion checkbox stays a medium log (no change for existing users). A long-press on the checkbox opens a tiny popover with three chips: *Light · Medium · Deep*. Tap one, log fires with that intensity. The motion row is the only surface affected; no detail-sheet trip required for the common case. Optional refinement: a second tap on the popover dismisses it without logging. The popover anchor stays attached to the checkbox so the interaction is purely thumb-local.

**Each chip shows the actual committed value next to its label.** The picker is not just three abstract intensity words; each chip displays the concrete pts (or hrs) it will log, computed live against the motion's `default_points` (or `default_hours`):

- Points mode example, motion default 2 pts: *Light · 1 pt* · *Medium · 2 pts* · *Deep · 3 pts*
- Hours mode example, motion default 1:00: *Light · 0:30* · *Medium · 1:00* · *Deep · 1:30*

This serves two purposes. First, the user sees exactly what they are committing, so the data they read later (totals, swell breakdowns, exports) matches what they intended at log time. Second, the picker doubles as a quick-tune surface for users who would otherwise open the detail sheet just to nudge a value up or down for a single log. Faster and lower-friction than the detail-sheet route, while still expressive. Display follows the HH:MM format established in Move 6 below for all hours-mode surfaces.

**Hours mode.** Multipliers apply to `hours` at log time. A 1:00 motion logged as deep records as 1:30. The hours-as-honest-accounting rule (PROJECT.md working agreement) is preserved because deep doesn't *inflate* time as a hidden multiplier; the picker shows the literal time that will be saved, the user accepts that value, and if they want a different number they can open the detail sheet and edit it directly. Users who care about minute-accurate tracking will edit in the detail sheet; users who want a fast intensity dial will use the picker. Both are honest because both show the saved number up front.

**Schema.** Add `logs.intensity text NULL DEFAULT 'medium'` with CHECK in (`'light'`, `'medium'`, `'deep'`). Idempotent migration. Existing logs backfilled implicitly to medium by the default. The points/hours columns on `logs` continue to store the *multiplied* values at log time; the source motion's default points/hours are unchanged. This means historical exports stay honest (the user logged 1.5× points on Tuesday because they marked it deep, and the export shows 1.5× points on Tuesday), and switching intensity multipliers later wouldn't retroactively change history.

**Why it's brand-consistent.** Optional. The default tap is unchanged. The user expresses their own read on the action; Onduler holds it. Bonus: months later, the Anchors radar can quietly distinguish "your deep weeks vs your light weeks" without any coaching content, just witness rendering.

**Acceptance check.** Long-press on a motion checkbox opens the intensity picker within 250ms. Each chip shows the literal pts (or hrs) it will commit. Picking deep credits 1.5× points to the parent swells using the existing `contribution_weight` machinery. Single-tap logging is unaffected. Export shows intensity per row.

**Waypoint counting (confirmed).** Intensity does **not** affect waypoint counting. A log is one log for waypoint progress regardless of intensity. The multiplier shapes points and hours only. This keeps waypoints as a count-of-events instrument, which matches their existing semantics (e.g., "3 home-cooked meals this week" means 3 distinct cook events, not 3.5 because one was deep).

**Files touched.**

- `scripts/migrate-log-intensity.sql`: idempotent column add with CHECK.
- `supabase-migration.sql`: canonical schema update.
- `app/dashboard/components/DailyChecklist.tsx`: long-press → intensity popover, multiplier applied to log payload.
- `app/actions/motions.ts` (`quickLogMotion`): accept optional `intensity` arg, apply multiplier server-side as a safety net, persist on log row.
- `app/api/export/route.ts`: include `intensity` in log rows.

---

### 6. Hours format sweep: decimal to HH:MM

**Problem.** Onduler's current hours display uses decimal hours rounded to 0.25 (per the existing ceil rule in PROJECT.md). The decimal format is technically precise but reads unnaturally for habit and wellness contexts. A user logging a 45-minute walk thinks "45 minutes," not "0.75 hr." Decimal hours is the format used by accounting and billing software, not by tracker apps.

**Standard in the category.** Time-tracking apps (Toggl, Clockify, RescueTime) default to HH:MM. Health and activity apps (Apple Health, Strava, iOS Screen Time) use natural language (`1h 30m`). Decimal hours is rare outside billing.

**The move.** Update the app-wide hours display from decimal (`0.75 hr`) to HH:MM (`0:45`). 15-minute granularity stays as the floor (no schema change needed; the underlying float is unchanged, only the display rule changes). Hour inputs accept both `0:45` and `0.75` typed in, normalizing internally.

**Conversion examples (for the build session).**

| Underlying float | Decimal display (current) | HH:MM display (new) |
|---|---|---|
| 0.25 | 0.25 hr | 0:15 |
| 0.5 | 0.5 hr | 0:30 |
| 0.75 | 0.75 hr | 0:45 |
| 1.0 | 1 hr | 1:00 |
| 1.25 | 1.25 hr | 1:15 |
| 2.5 | 2.5 hr | 2:30 |

**PROJECT.md working agreement update.** The current rule (*"in hours mode, to 0.25 hr, 15-minute calendar blocks"*) updates to *"in hours mode, displayed as HH:MM at 15-minute granularity"*. Underlying state stays a precise float; only the display rule changes. Ceil semantics carry over (a 0.42 hr underlying value displays as `0:30` since ceil-to-quarter-hour rounds up to 0.5).

**Surfaces to sweep** (every place an hours value reaches the screen):

- `lib/periods.ts` → `ceilDisplay(n, isHours)`: change hours branch to return HH:MM string instead of decimal-rounded float.
- `lib/periods.ts` → `monthlyTargetDisplay`, `lifetimeTargetDisplay`: same.
- Daily progress bar (Motions page): pts/hrs readout under the day total.
- Daily goal display (Settings → Tracking).
- Swell weekly target readouts (`/swells` list rows, `/swells/[id]` proficiency view header).
- Constellation node values inside the per-swell view.
- Radar drag pill (`/anchors` page): live readout while dragging a target.
- Reset-to-build diff dialog.
- Motion detail sheet: default points/hours readout, edit field.
- Motion creation form: hours input.
- Swell creation/edit form: weekly target input.
- Anchors page period stats (total / averages / breakdowns).
- Activity feed timestamps and per-row values.
- Intensity picker chips (Move 5) inherit this format automatically.

**Hour inputs accept both formats.** A user typing `0:30` or `0.5` in any hours input lands at the same stored float (0.5). The input parser checks for a colon and parses accordingly; otherwise falls through to the existing float-parse. Pure helper in `lib/periods.ts → parseHoursInput(text): number | null` consumable from every input.

**Export format.** Export rows keep the underlying float (`hours: 0.5`) for portability, since CSV/JSON consumers expect a number, not a formatted string. If downstream tooling wants to render HH:MM, it can.

**Why it's brand-consistent.** Matches the paper-list and surf-leaning voice better than decimal hours. Reads as plainspoken rather than spreadsheet-y. The user thinks in minutes; the display now matches.

**Acceptance check.** Banned-pattern audit: zero instances of `0.25 hr`, `0.5 hr`, `0.75 hr`, `1.25 hr`, etc. in any rendered UI string. Toggle Settings → Tracking from points to hours, log a few motions at various intensities, sweep the app, every surface reads HH:MM.

**Files touched.**

- `lib/periods.ts`: `ceilDisplay`, `monthlyTargetDisplay`, `lifetimeTargetDisplay` update; new `parseHoursInput` helper.
- `PROJECT.md`: the ceil-display working agreement bullet rewords.
- Every component listed in "Surfaces to sweep" above: replace existing decimal-hours render with the new helper. Grep `isHours` to find them.

**Move 6 should land before or in the same session as Move 5.** The intensity picker chips need the new format, so building Move 5 against decimal-hours displays would be wasted work. Easiest is to ship Move 6 first as its own polish session, then Move 5 on top.

---

## Suggested build order

The six moves are independent enough that they could ship in any order, but the cheapest-to-ship-first ordering is:

1. **Move 1 (Buckets copy).** No schema, no UI, pure copy. Ships in one short session.
2. **Move 6 (Hours format sweep).** No schema, broad surface sweep. Mid-size session. Lands before Move 5 so the intensity picker inherits the new format.
3. **Move 5 (Intensity).** Single schema add, focused UI change on one component, exports get an extra column. Mid-size session.
4. **Move 2 (Intention prompt).** Schema add plus ceremony flow update. Mid-size session, sits cleanly on top of the existing Anchors v2 work.
5. **Move 3 (Dashboard friction audit).** Investigation pass first, then targeted fixes. Small session.
6. **Move 4 (Notifications)** waits for the native shell phase. Not in this spec's build window.

Total: roughly four build sessions for moves 1, 2, 3, 5, and 6. Move 4 is queued, not scheduled.

## What this spec deliberately does not include

- **Native iOS shell.** Decided as its own future phase, not a port. Track separately.
- **AI-suggested motions or insights.** Violates witness, not coach. Permanently off the table for the on-by-default surface; LLM-assisted import (shipped) is the user-initiated exception.
- **Streaks, deficit notifications, badges, FOMO mechanics.** Inherited rulings from `engagement-layer.md`.
- **Per-motion cue or why fields.** Rejected this session. See "What's explicitly off the table" above.

## Cross-references

- `docs/decisions/0007-reflections-surface.md`: ceremony flow that Move 2 extends.
- `docs/decisions/0010-wake.md`: wake as the visual that Move 5's intensity data will eventually feed.
- `docs/specs/engagement-layer.md`: the seven moves around contact frequency. This spec is the behavior-side companion.
- `PROJECT.md` working agreement *"Onduler's voice is witness, not coach"*: the constraint every move in this spec is tested against.
