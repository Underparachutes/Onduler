# Onduler: Engagement Layer Spec (v1.1)

**Date:** 2026-05-27
**Status:** Designed, not yet built. Targets the v1 testing window.

## The core insight

Onduler's natural cadence is weekly, not daily. The payoff surfaces (the radar, the cycle-close ceremony, the wake) all live on the weekly cycle. The wave/tide design assumes people will have weeks they show up a lot and weeks they don't. Optimizing hard for daily logins would install the very mechanics that PROJECT.md explicitly rules out (streaks, deficit notifications, FOMO triggers, comparison-to-other-users) and would quietly hollow the brand.

The right goal isn't "daily engagement." It's "enough recurring contact for the weekly cycle to do its work." Within that constraint, this spec covers seven coordinated moves that give users brand-consistent reasons to come back often.

## What this spec is reacting to

Two testers as of 2026-05-27. Both completed signup and onboarding without bug reports. Both described being confused about what to do with the app.

- **Tester 1 (Damien)** DM'd: *"Motions are sort of like a recurring todo/goal list right?"* He reached for the closest known schema. The dashboard he landed on after onboarding is a checklist, which is the least Onduler-distinctive surface the app could have served him.
- **Tester 2** said *"It's such a cool idea! I am still trying to figure it out"*. The vibe landed, the mechanics didn't snap.

The shared root cause: after onboarding, both testers see a daily checklist before they see anything that signals Onduler's actual model (swells as a picture, motions as what feeds the picture). The weekly radar payoff only becomes visible at `/anchors` after enough log days to unlock the ceremony, which means they have to take it on faith for a week. Most won't.

Adjacent prior work that partly addresses this:

- **[onboarding-hint-cards.md](./onboarding-hint-cards.md)**: designed not yet built. Adds dismissible orientation cards to each surface. Solves the "what is this tab" layer. This engagement spec assumes hint cards ship and *complements* them rather than duplicating.
- **[ADR 0007: Reflections surface](../decisions/0007-reflections-surface.md)**: the weekly cycle-close ceremony, locked-page mystery posture, unlock floors.
- **[ADR 0010: Wake](../decisions/0010-wake.md)**: the shape-derived-from-logs visual that anchors the locked page.
- **[launch-plan.md](../launch-plan.md)**: distribution voice and brand-as-secret-club framing.

## What's explicitly off the table

These mechanics would drive raw DAU. They are also the mechanics PROJECT.md positions Onduler against. Each one gets ruled out by name so future temptation doesn't slip them back in:

- **Streaks (any subtractive continuity).** Every absent day becomes a small failure. The wave/tide design collapses on first skipped day. Alternative: additive continuity per Move E below.
- **Deficit notifications** (*"You haven't logged in 3 days!"*). Makes the user feel watched, not seen. Direct violation of PROJECT.md's *"never uses the language of failure, deficit, or falling behind."* Alternative: seen-not-watched voice per Move F.
- **FOMO mechanics** (*"limited time," "expiring rewards," "join now"*). Artificial urgency contradicts the wave/tide patience model. The whole point is the app waits for the user.
- **Comparison to other users** (*"your friend logged 5 motions today"*). Comparison breeds shame. Celebrate-showing-up must be self-referential. Defer indefinitely; revisit only if the product moves toward small-group accountability as a separate paid surface.
- **Daily badge or achievement system.** External validation hijacks internal noticing. The existing celebration animations (per-theme bloom, ripple, tideline) work because they're immediate, transient, and tied to the user's own targets. Collectible badges don't.
- **Push notifications outside opt-in cadences.** Anything pushed by default feels chasing. Defer until there's a real surface for notification preference granularity, and even then default to off.

## The seven moves

Each move below: *the problem it solves*, *the move*, *sample copy and component shape*, *why it's brand-consistent*, *acceptance check*.

---

### A. Shape as dashboard front door

**Problem.** New users finish onboarding and land on a daily checklist. The checklist is structurally indistinguishable from a todo app. The radar that would teach them the actual model lives at `/anchors`, gated by the weekly-ceremony unlock. They have to take Onduler's distinctive model on faith for a week, during which most will quietly file the product under "todo app with a weird coat of paint."

This is the single highest-leverage move in the spec because it doubles as the onboarding mental-model fix. Tester 1's "recurring todo/goal list" frame happens because the dashboard he sees IS structurally a recurring todo list. Show him the shape and the frame shifts.

**The move.** A compact live shape (radar polygon, same swell colors and weighting as the `/anchors` radar) renders at the top of the dashboard, above the daily checklist. Visible from day one. Fills in as the user logs. No chrome, no headline above it, no metric overlay. The shape carries the meaning.

**Sample copy.** None on the shape itself. Optionally, a single quiet line directly below it. Default candidates, all lowercase, all forward-framing per Move D:

> *this week so far*

or

> *fresh week. shape forming.*

(Day-aware rotation per Move D pulls the right one.)

**Component shape.**

New file: `app/dashboard/components/DashboardShape.tsx`

```ts
type Props = {
  swells: SwellWithLogs[]  // same shape SwellRadar consumes
  weekLogs: Log[]           // this-week logs, Pacific Sun→Sat
  isInWave: boolean         // hide when in wave (per ADR 0010 wake behavior)
  unlocked: boolean         // tap behavior: nav to /anchors when true, no-op when false
}
```

Renders a compact 140px-side radar using a slimmed version of the existing `SwellRadar` math from `lib/radar.ts`. Reuses `slicePath`, `shoulderVertex`, the wedge geometry. Strips: drag handles, the chart-ceiling pill, the multi-class chip, the reset chip, the wave-month pill. Keeps: the frosted-glass wedges, the ombré slice fills, the shoulder polygon stroke, the swell colors.

Reads from the same SSR fetch as `/anchors` (parallelize via the existing `Promise.all` pattern in `app/dashboard/page.tsx`). No additional round trip.

Logged-events listener (per Move B) drives the morph animation when a new log commits.

When `isInWave === true`, the shape hides per the wake-during-wave rule from ADR 0010. The space collapses; the daily checklist slides up to take its place. The dashboard never shows a half-faded shape during wave mode. Clean hide, clean reappear when the user logs after surfacing.

**Schema.** None.

**Why brand-consistent.** The shape *is* the brand. The locked Anchors page already uses the same visual language as the mystery hook. Bringing it to the dashboard means the first surface after onboarding has Onduler's distinctive visual identity rather than a generic checklist. No new mechanic, no new chrome. Just the existing wake/radar visual surfaced earlier and more often.

**Acceptance check.**
- A new signup completes onboarding and lands on the dashboard. A 140px shape is visible at the top of the page, above the checklist.
- Before any logs, the shape renders an empty pulsing circle (matching the locked-page empty state per ADR 0010).
- After logging one motion, the shape morphs visibly within ~300ms to reflect the swell that motion fed.
- During wave mode, the shape is hidden. After the first post-surface log, the shape reappears.
- Tapping the shape navigates to `/anchors` when weekly is unlocked; no-op (or quiet tooltip) when locked.
- The shape never displays "0/7 days," any deficit-coded number, or any text that frames absence as failure.

---

### B. Visible morph on every log

**Problem.** Logging needs to produce immediate visible change beyond the checkmark and the existing daily progress bar fill. If a tap feels like data entry into a void, the dopamine loop is weak and the user has less reason to come back. The celebration animations (per-theme bloom, ripple, tideline) already help, but they only fire on swell crossings, not on every log. Most logs produce no celebration.

**The move.** Every log triggers a subtle morph on the DashboardShape (Move A) within 300ms of the tap. The matching swell wedge fills a tick. The shoulder polygon redraws. No new "reward animation". Just making the existing data change visibly.

This is *not* a slot machine. The morph is calibrated to feel like confirmation, not like the user just won something. The brand line: celebrate showing up, don't gamify the tap.

**Sample copy.** None. Visual only.

**Component shape.**

Augment `app/dashboard/components/DailyChecklist.tsx`:

```ts
// Inside the optimistic-log handler, after the existing celebration trigger:
window.dispatchEvent(new CustomEvent('onduler:log-committed', {
  detail: {
    motion_id: motion.id,
    swell_ids: motion.swells.map(s => s.id),
    timestamp: Date.now(),
  }
}))
```

`DashboardShape.tsx` subscribes:

```ts
useEffect(() => {
  const handler = (e: CustomEvent) => {
    // recompute wedge actuals optimistically (don't wait for router.refresh)
    // animate the affected wedge(s) with a 250ms ease
  }
  window.addEventListener('onduler:log-committed', handler as EventListener)
  return () => window.removeEventListener('onduler:log-committed', handler as EventListener)
}, [])
```

Use the existing CSS variable theming and animation primitives. No new dependencies.

**Schema.** None.

**Why brand-consistent.** This adds nothing new. It makes the existing data change legible. The user isn't being rewarded for tapping; they're seeing their actual contribution to their actual shape. That's noticing, not gamification.

**Acceptance check.**
- Tapping a motion logs it, the checkmark appears, the daily progress bar fills, AND the DashboardShape morphs within ~300ms.
- The morph is subtle (no bounce, no overshoot, no sparkles). It feels like confirmation, not reward.
- The morph fires reliably even when the user taps multiple motions in quick succession (queue or coalesce as needed).

---

### C. Gentle rotating morning prompt

**Problem.** Users need a small reason to open the app that isn't "I have to log things." A daily rotating piece of fresh content gives them that reason. The risk is sliding into nag-voice, which would betray the brand.

**The move.** A single optional line at the top of the dashboard that rotates day to day. Voice is noticing, never accusatory. Wave-mode-aware. Dismissable for the day (the `×` pattern from `HintCard`).

**Sample copy.** Bank of ~12 prompts, rotated by day-of-week-modulo-bank-size with wave-mode and ceremony-state overrides. All lowercase, no question marks where it would feel interrogating (some keep the question mark intentionally because the question is gentle):

Default (tide mode):
- *what pulled you in yesterday?*
- *anything quietly building?*
- *what's been ambient lately?*
- *what showed up without being on the list?*
- *what surprised you?*
- *what's true today?*
- *small things count.*
- *it's [day]. one thing.*

Wave-mode override (when `isInWave === true`):
- *still in the wave. drop one when you surface.*
- *no pressure. we'll be here.*

Post-ceremony override (Monday morning after a Sunday ceremony):
- *fresh week. shape forming.*

Saturday override (anticipation per Move D):
- *last day before the week closes.*

**Component shape.**

New file: `app/dashboard/components/MorningPrompt.tsx`

```ts
type Props = {
  isInWave: boolean
  lastCeremonyAt: string | null  // ISO timestamp, used for post-ceremony override
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6  // Pacific, Sun=0
}
```

Prompt bank in new file: `lib/prompts/morning.ts`:

```ts
type MorningPrompt = {
  key: string
  text: string
  condition?: (ctx: PromptCtx) => boolean
}
type PromptCtx = {
  isInWave: boolean
  lastCeremonyAt: Date | null
  dayOfWeek: number
  dateKey: string  // YYYY-MM-DD Pacific
}

export const MORNING_PROMPTS: MorningPrompt[] = [/* …bank above… */]

export function selectPromptForDay(ctx: PromptCtx): MorningPrompt {
  // 1. Wave-mode override wins
  // 2. Post-ceremony Monday override
  // 3. Saturday anticipation override
  // 4. Otherwise: deterministic pick by hash(dateKey) % defaultBank.length
}
```

Dismiss state in `localStorage` keyed by date (`onduler:morning-prompt-dismissed:YYYY-MM-DD`). Auto-clears when the date changes (next-day reload picks a new prompt with fresh dismiss state).

Visual treatment: single line, `text-th-secondary`, `text-sm`, `italic`, lowercase. Small `×` to the right. Sits above the DashboardShape.

**Schema.** None.

**Why brand-consistent.** Every prompt is a noticing invitation, never a demand. Wave-mode override directly honors PROJECT.md's *"the app's response is to not chase you."* The dismiss-for-today pattern says "this is here if you want it" rather than "engage with this or feel bad."

**Acceptance check.**
- A user opening the dashboard on a fresh day sees one prompt at the top.
- Tapping `×` dismisses it for the rest of that day; reopens fresh tomorrow.
- A user in wave mode sees a wave-mode-aware prompt instead of a default one.
- Monday morning after a Sunday ceremony shows the post-ceremony prompt.
- No prompt in the bank uses deficit language ("you haven't," "you missed," "you should," "don't forget").
- The prompt is the same for the user across reloads on the same day (deterministic by date).

---

### D. Week as anticipation, not deadline

**Problem.** Most week-based UI in habit apps frames the week as a deadline: *"3 of 7 days logged this week."* That's subtractive. It implies the user is falling short. Onduler's brand position requires the opposite framing: the week is building toward Sunday's ceremony, which is a closing moment, not a finish line.

**The move.** Wherever the dashboard surfaces week progress, frame it forward-looking. A small day-aware line near the DashboardShape. Sunday's copy explicitly invites the ceremony rather than counting unfinished days.

**Sample copy.** Day-of-week pure helper, deterministic. All lowercase, italic, secondary text:

- **Sunday (week start):** *fresh week. what's first?*
- **Monday–Wednesday:** *day [N]. shape forming.*
- **Thursday–Friday:** *most of the way through. sunday closes the week.*
- **Saturday:** *last day before the week closes.*
- **Sunday (week end, after Sat, if cycle hasn't closed yet for some reason):** *ceremony ready when you are.*

Note: in Onduler, weeks run Sun→Sat (per PROJECT.md update 2026-05-25). Sunday morning is the *start* of a new week; the *previous* Sunday's ceremony fires on the rollover. So the week-narration is:

- Sun 00:00 Pacific → new week begins. Last week's ceremony banner appears at the top of `/anchors`.
- Through Sat 23:59 Pacific → the week is building.
- Sun 00:00 Pacific → that week closes; new one begins.

So Sunday morning isn't "ceremony day". It's "fresh week" day. The ceremony pertains to the *just-closed* week and is invited from `/anchors`.

**Component shape.**

Pure helper in `lib/week-narration.ts`:

```ts
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6  // Pacific, Sun=0

export function weekNarrationFor(day: WeekDay): string {
  // returns the right copy per the table above
}
```

Rendered inside `DashboardShape.tsx` or as a sibling component, directly below the shape, above the optional `MorningPrompt`. Wraps `weekNarrationFor(pacificDayOfWeek())`.

The two surfaces (`MorningPrompt` and the week-narration line) can coexist visually because they serve different roles: morning prompt invites a noticing, week-narration sets the cycle context. Stack them with `MorningPrompt` on top (italic, secondary), `week-narration` below (lighter, muted). When in wave mode, the week-narration line hides (the wave-mode prompt absorbs the contextual frame).

**Schema.** None.

**Why brand-consistent.** Reframes Sunday as a meaningful closing moment rather than a deadline you're failing to meet. Honors PROJECT.md's ceremony-as-the-strategic-reflection-surface positioning. Zero deficit framing.

**Acceptance check.**
- Each day of the week, the dashboard surfaces the correct day-aware copy.
- Never uses "3/7," "you missed X days," or any subtractive frame.
- Saturday's copy frames anticipation, not last-chance urgency.
- During wave mode, the week-narration line hides cleanly.

---

### E. Additive continuity (the streak-replacement)

**Problem.** Streaks drive habit-app DAU more than any other mechanic. They're also categorically off-brand for Onduler. But humans do find "I've been showing up" continuity satisfying. There needs to be a brand-consistent surface for that satisfaction that doesn't reintroduce deficit framing through the back door.

**The move.** A quiet additive-only continuity line. *"Showed up 4 days this week."* The number only goes up. Skipping a day doesn't decrement anything visible. Wave mode pauses the counter copy (replaces it with wave-mode copy). The week boundary resets the count, but the rollover is framed as fresh (per Move D), not as a broken streak.

Critically: no fire emoji, no red, no "streak" word anywhere. No "Don't break your X-day streak!" notification ever. If the temptation comes back, refer to this section.

**Sample copy.**

Default (active days this week ≥ 1):
- *showed up [N] day[s] this week.*

Pluralization handled per PROJECT.md's count-based pluralization rule:
- *showed up 1 day this week.*
- *showed up 4 days this week.*

Wave mode:
- *wave mode. picking back up wherever you land.*

First log of a fresh week (after Sunday rollover):
- *fresh week. just started.*

Zero logs into a non-fresh week (e.g., user opens app Wednesday with no Mon/Tue logs):
- *nothing yet this week. drop one when you're ready.*

(That last one walks a brand-line; it's gentle, but if it tests as feeling watched, drop it and render no line at all when count is zero past day 1.)

**Component shape.**

Helper in `lib/continuity.ts`:

```ts
export type WeekContinuity = {
  distinctLogDays: number  // 0-7
  totalLogs: number
  isInWave: boolean
  isFreshWeek: boolean     // Sunday Pacific or no logs yet
}

export async function getThisWeekContinuity(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string
): Promise<WeekContinuity> {
  // Query logs WHERE logged_at >= thisWeekSunday() AND user_id AND chapter_id
  // Distinct days = count of unique pacificDayKey(log.logged_at)
  // isInWave: check current wave_checkin status
  // isFreshWeek: distinctLogDays === 0 && pacificDayOfWeek() === 0
}
```

New component `app/dashboard/components/WeekContinuity.tsx`:

```ts
type Props = { continuity: WeekContinuity }
```

Renders as a single line, `text-th-muted`, `text-xs`, sits below the week-narration line.

SSR-fetched in `app/dashboard/page.tsx` parallel to the existing reads. Updates optimistically on log-committed event (Move B).

**Schema.** None. Derived entirely from existing `logs` and `wave_checkins` tables.

**Why brand-consistent.** Additive only. Wave-aware. Week-bounded so each week is its own thing; a hard week doesn't accumulate into a "longer broken streak" guilt-trip. Honors PROJECT.md's *"showing up at all is honored."*

**Acceptance check.**
- Dashboard surfaces a positive count of days logged this week.
- The count never visibly decreases during the week.
- Sunday rollover starts a fresh count for the new week; no UI element references the previous week's count as "broken" or "lost."
- Wave mode replaces the count with wave-mode copy; the count is silently paused (still accumulates if the user logs during the wave, but the framing stays wave-aware).
- Pluralization follows count-based rule from PROJECT.md.

---

### F. Notification voice: seen, not watched

**Problem.** When notifications eventually ship, the line between "thoughtful reminder" and "creepy nag" is brand-load-bearing. One off-brand notification template can undo a lot of in-app voice work because notifications appear on the user's home screen, outside Onduler's visual context, where they feel especially exposed.

**The move.** Document a single voice principle that gates all notification copy. The test: does this make the user feel *seen* (something true noticed about them) or *watched* (surveilled)? Always lean seen.

This is not a component or a schema. It's a working agreement that gets added to PROJECT.md and referenced in every notification PR.

**Sample copy.** A reference grid for future copy decisions:

| ✓ Seen | ✗ Watched |
|---|---|
| *"Your Movement swell hasn't seen action in 10 days. Worth a look?"* | *"You broke your 12-day streak!"* |
| *"Sunday: your week is ready to close."* | *"Don't forget to log today!"* |
| *"Three new motions feeding Mind this month. Quietly building."* | *"You're behind on Mind."* |
| *"Wave mode for a week now. No pressure. We're here."* | *"You haven't logged in 7 days."* |

The seen frame names something true and observed. The watched frame implies surveillance plus expectation.

**Component shape.** This is a voice rule. The implementation is a section in `PROJECT.md` under voice/working-agreements:

```markdown
### Notification voice

All notification copy passes the seen-vs-watched test. Does the message name
something true the user might want to notice (seen), or does it imply
surveillance plus expectation (watched)? Always lean seen.

Reference: docs/specs/engagement-layer.md §F.
```

When notifications ship, every template lives in `lib/notifications/templates.ts` with a comment referencing this section.

**Schema.** None for this move. (Notifications themselves will need schema when they ship; out of scope for this spec.)

**Why brand-consistent.** PROJECT.md is explicit: *"never uses the language of failure, deficit, or falling behind."* Notifications are the easiest place to violate this principle accidentally because they're written in batch, often by someone other than the founder, often late in a sprint.

**Acceptance check.**
- The voice rule is captured in PROJECT.md so future copy decisions reference it.
- When notifications ship, every template passes the seen/watched test in code review.

---

### G. Anchors daily-peek pre-unlock

**Problem.** The locked Anchors page is pure vibe (intentional, good for first-time mystery). But that means there's nothing changing visibly day to day on that surface during week 1, no reason to peek back. Once unlocked, the journal exists but doesn't have a "what's new" surface inviting return visits between ceremonies.

**The move.** Two coordinated sub-moves on `/anchors`.

**G.1. Pre-unlock: verify the wake polygon on the LockedPage actually reflects the user's live logs.** Per ADR 0010, the wake is *"live actuals-only polygon... coalesce-from-circle animation as the user logs."* Verify this is rendering pre-unlock (vs. the seeded random used on marketing surfaces). If the LockedPage currently shows the seeded-random wake before unlock, fix it to show the live wake from day one. This gives the user a daily-evolving silhouette to peek at even before the weekly unlocks the rest of the page.

**G.2. Post-unlock: add a "recent" surface to the journal landing.** A small section above the chapter-grouped journal entries showing the most recent free anchor's first line (truncated), or (if no free anchor exists yet) the most recent ceremony anchor's date. Something that changes between visits.

**Sample copy.**

Pre-unlock: the wake is the visual. No new copy needed. The existing LockedPage copy stays as-is.

Post-unlock recent surface: no header, just the entry. Visual treatment matches a quiet preview card (`bg-th-surface/60`, `border-th-border-soft`, `p-3`, `text-sm`, `text-th-secondary`). Tapping it routes to the full anchor.

If the most recent anchor is a ceremony anchor and there are no free anchors:

> *(small icon) ceremony · [date]*

If the most recent is a free anchor:

> *(truncated first ~80 chars of body)…*

**Component shape.**

G.1 audit: check `app/anchors/components/LockedPage.tsx` and the wake rendering path. Confirm it consumes live `wake_polygon_for(userId, chapterId, cycle='week')` data, not the seeded-random generator from `lib/wakes.ts.generateRandomWake()`. If it's the seeded one, swap to live.

G.2 new component: `app/anchors/components/RecentAnchorPeek.tsx`:

```ts
type Props = {
  mostRecent: { id: string; cycle_type: string; body_text: string | null; created_at: string } | null
}
```

SSR-fetched in `app/anchors/page.tsx` parallel to existing reads. Renders above the existing journal sections. When `mostRecent === null`, renders nothing.

**Schema.** None.

**Why brand-consistent.** Pre-unlock keeps the mystery posture (no chrome added to the LockedPage) but ensures the mystery is *responsive to the user's actions*. The silhouette evolves because of them. Post-unlock gives a small reason to peek without becoming nag-driven; the user controls what to look at, the surface just makes "what's recent" easy to find.

**Acceptance check.**
- A user opening LockedPage mid-week sees the wake polygon reflecting their actual logs (not the seeded-random marketing wake).
- After unlock, the journal landing shows a "recent" surface above the chapter list.
- The recent surface updates whenever the user drops a new free anchor or completes a ceremony.
- When the user has no anchors of any kind yet, the surface renders nothing (no empty state with chrome; quiet is better).

---

## Sequencing

Not all seven moves should ship together. The right order is determined by which moves unblock the v1 exit criteria (5 testers complete a weekly ceremony, 2 consecutive weeks of no-surprises feedback).

**v1.1: ship in current testing window (before next wave of testers).**
- **A. Shape as dashboard front door.** Highest leverage. Doubles as onboarding mental-model fix.
- **B. Visible morph on every log.** Trivial once A ships; small Add.
- **G.1. Pre-unlock wake audit.** Tiny verification + possible swap. Single-session.

These three together change what new testers see in their first day in a way that materially shifts the mental model installed during onboarding. If they ship before more testers come through, the next wave's confusion will be a different shape (better data for diagnosing what's left).

**v1.2: ship after first 5 testers complete a ceremony.**
- **D. Week as anticipation.** Pure copy + helper. Cheap. Waits for v1.2 because the impact only matters once testers have lived through a full week.
- **E. Additive continuity.** Worth waiting on real tester behavior before committing the copy.

**v2 candidates: defer.**
- **C. Morning prompt.** Most product surface, most risk of off-brand voice if rushed. Defer until the seen-not-watched rule (F) is documented and tested in lower-stakes copy first.
- **F. Notification voice.** Documentation move, but only useful when notifications themselves are real. Notifications are not yet on the v1 roadmap.
- **G.2. Post-unlock recent surface.** Refinement, not critical path.

The dependency line: A unblocks B and unblocks the dashboard's ability to host C, D, E. F is purely a voice rule independent of timing.

## Cross-references

- [onboarding-hint-cards.md](./onboarding-hint-cards.md): orientation cards on each surface, designed not yet built. Complements this spec; assumed to ship.
- [ADR 0007: Reflections surface](../decisions/0007-reflections-surface.md): weekly cycle-close ceremony, locked-page posture, unlock floors.
- [ADR 0010: Wake](../decisions/0010-wake.md): wake polygon behavior, wave-mode hide/reappear, empty-state pulsing circle.
- [ADR 0008: Reflections renamed to Anchors](../decisions/0008-reflections-renamed-to-anchors.md): anchors vocabulary.
- [launch-plan.md](../launch-plan.md): distribution voice, brand-as-secret-club, the "every motion leaves a wake" tagline.
- PROJECT.md: vocabulary contract, voice rules, brand position, v1 exit criteria.

## Open questions

Surfaced rather than papered over.

1. **Does the DashboardShape need a label?** Move A specifies the visual carries the meaning. But for the first ~3 days a new user is on the app, the shape might be too sparse to communicate its purpose. Worth A/B testing in DMs with the next wave of testers: ship with no label vs. ship with the quiet "this week so far" sublabel, see which lands. Default to no label per the radar-as-self-explanatory principle, revisit if testers don't grok it.

2. **Where does Move E's continuity line live during wave mode?** The wave-mode override copy is specified, but the visual real estate it occupies should probably collapse rather than stay reserved when the user is in a long wave. Otherwise it becomes a daily reminder that "you've been in a wave for 23 days" which veers from seen toward watched. Recommendation: after 7+ consecutive wave days, the line hides entirely rather than rendering the wave copy on a loop.

3. **Should the morning prompt (Move C) ever pull from the user's actual recent activity?** A generic "what surprised you?" works at any time. A specific "you've been quietly building Mind. What's it for?" works better but requires reading user state and getting the voice right. Defer specifics to v2; ship the generic bank first.

4. **Does the dashboard shape compete with the daily progress bar?** Both surface "your week is filling in" at the same physical location. Worth deciding which is primary. Recommendation: the shape becomes primary, the daily progress bar softens to match the swells-page treatment from the 2026-05-21 polish batch (3px tall on `bg-th-border`, denominator at `text-[10px]`). The shape carries the weekly story; the bar carries the daily.

5. **What's the right copy for the empty DashboardShape on day 1?** "Fresh week. Shape forming." is reasonable. But day 1 is also when "what is this?" confusion peaks. Hint cards (the adjacent spec) might be the right place for a one-liner here rather than this spec. Defer to the hint-cards build session.

---

## Sidebar: voice in founder communications

*Captured as a worked example because the lesson generalizes beyond product copy. Decided 2026-05-27.*

On 2026-05-27, one of Onduler's first two testers (Damien, signed up that morning) DM'd:

> *"For sure! Motions are sort of like a recurring todo/goal list right?"*

Josh's reply was:

> *"Exactly. Over time you get to see where you are putting your energy and readjust if it's out of balance."*

Two things went wrong here.

**First, the *"exactly"* confirmed a frame the entire product vocabulary is designed to escape.** *"Todo"* and *"goal"* are both on PROJECT.md's never-use list. Once Damien has the wrong frame installed, week 2's swell radar won't fit it; the brain patches new info into the existing model rather than replacing it. Wrong frames are harder to dislodge than to prevent.


**Second, the follow-up message *("I weight things I don't want to do higher so it incentivizes me to them")* positions Onduler as a self-coercion tool**, which is the opposite of the brand promise (*"a gentler way to track what you actually do"*). The marketing voice on the IG post and the founder-DM voice were pulling in opposite directions.

The corrected reply, in product-builder voice (not evangelist voice):

> *"Sort of, with a twist. Motions feed swells, which are the noun-shaped areas of your life. You end up watching the balance, not the checklist."*

Two extra sentences that rewire the mental model while the tester is still curious.

**The lesson generalized.** In tester DMs, marketing copy, founder podcasts, and any positioning conversation, the founder voice should match the in-app voice. Frictionless-but-vague conversation transfers no information. The committed pitch attracts some testers strongly and filters out others, which is the right shape at this stage of the product. The vocabulary feeling weird to type ("set up your motions to feed your swells") is a feature, not a bug. Distinctive language is doing its work. Notion didn't apologize for "page" and "block" sounding weird in 2016. Apple didn't apologize for "FaceTime."

This is the same seen-vs-watched principle from Move F, applied to founder voice. The DM equivalent of a watched notification is a founder who validates the wrong frame to keep the conversation flowing. The DM equivalent of a seen notification is a founder who corrects the frame and trusts the tester to either get it or move on.

---

*End of spec.*
