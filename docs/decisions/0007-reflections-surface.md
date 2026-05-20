# 0007 — Reflections surface, cycle-close ceremony, and bottom-nav rename

**Status:** Accepted
**Date:** 2026-05-18
**Amended:** 2026-05-20 — see ADR 0008. The surface is renamed from **Reflections** to **Anchors** (surface name, entry-level word, route, file paths). The `reflections` schema table is preserved per the internal/external split. References to "Reflections" in this ADR are still accurate as the prior surface name and remain correct as schema/internal language (`reflections` table, `app/actions/reflections.ts`, etc.); user-facing copy uses "Anchors."

## Decision

The Log page is renamed **Reflections** and repositioned from "diagnostics" to *the mirror where the user adjusts themselves* — the strategic reflection surface where change happens. The Today page is renamed **Motions** (with a checkbox icon in the bottom nav), so the four bottom-nav surfaces become noun-shaped and role-clear: Motions (ritual), Swells (strategy), Reflections (reflection / change), Settings (configuration).

A new **cycle-close ceremony** lives on Reflections, fired by the bottom-nav tab itself when a cycle closes. The ceremony has one shape across four cadences (weekly, monthly, quarterly, yearly): a single looking-back prompt — *"What did you expect to see this [week/month/quarter/year]?"* — then the closed-cycle radar reveal, then a single looking-forward-by-noticing prompt — *"What did you see?"* — then a soft *"Want to tune something?"* CTA with links to Swells / Motions / Skip. Both text fields are optional and individually skippable. The motivational-interviewing work happens in the gap between expectation and observation; the user does their own noticing, and Onduler never judges.

Each cadence is **first-time-locked** — the user has to live through one full instance of that cycle, with an engagement floor, before that cadence unlocks for the rest of the chapter. Calendar-anchored: weekly anchors to Sunday (already locked elsewhere), monthly to calendar month, quarterly to calendar quarter (Q1=Jan–Mar etc.), yearly to calendar year. Engagement floor: 3 / 8 / 25 / 80 days logged respectively. Once a cadence is unlocked, it stays unlocked for the chapter.

The locked Reflections page is **vibe-only**: blurred radar silhouette, moving tide lines, glimpses of trends without hard numbers, soft copy with no date and no engagement counter. Pure mystery. Marketing site explains the pattern for users who want the mechanism.

A persistent **reflections journal** lives as a sub-surface at `/reflections/journal` — a contemplative library of every reflection the user has ever written, across all chapters, in chronological order with chapter separators. Each cycle-close ceremony saves an entry (closed radar + expectation text + observation text + did_tune flag). The `+` button in the top-right of `/reflections` opens a blank, free-form journal entry (default-anchored to the currently-viewed cycle, editable), with optional themed prompts available for users who want shape.

**Archive-and-fresh-start** lives only behind a cycle-close ceremony — reward reflection with a clean slate. Confirming archive moves the current chapter into the user's chapter library (Settings → Past chapters, browseable read-only) and starts a new chapter that re-onboards from scratch: new build pick, new swells, new motions, locked Reflections page. Skipping ceremony questions and tapping into archive is always permitted; the only friction is a soft warning that names what's happening.

**Skip is always a door** is added to PROJECT.md as a working-agreement-level principle. Every ceremony, every prompt, every cycle is skippable end-to-end. The user is never required to type or answer.

The **time-budget framing** ("points is the expressive mode where you weight motivation by inflating what your future-self values; hours is the honest mode where time is what it is") is added as a separate working agreement. Internal framing only — never a UI label.

## Why

### Why Reflections, not Logs

Onduler's four-surface split was already doing real work: Today for daily ritual, Swells for strategic per-swell tuning, Log for diagnostics, Settings for configuration. But "diagnostics" was the wrong frame for Log — that surface is where the user looks at their week or month and decides whether their shape still fits them. That's not diagnostics. That's *change*. Calling it Log positioned it as data-readout; calling it Reflections positions it as the moment-of-noticing-and-adjusting that the surface already wanted to be.

The rename also unblocks a real product move: cycle-close ceremonies. A "Log" page can't reasonably fire a celebratory walkthrough — the name fights the moment. A "Reflections" page is exactly where a Sunday-closing reflection belongs. The rename and the ceremony are the same decision in two parts.

Surface-content noun consistency on the bottom nav is the secondary win (Motions / Swells / Reflections / Settings). The primary win is positional: Reflections is where the user comes to *adjust themselves*, and the surface name now reads as that.

### Why "the mirror where you adjust yourself"

This is the load-bearing sentence from the design session and probably the clearest articulation of what Logs/Reflections is *for*. It belongs in PROJECT.md (added to the four-surface working agreement). Most habit apps have a "stats" or "history" page that the user looks at and then closes — passive. Onduler's reflection surface should be the surface where you look, notice, and *change something* — and the data model and the ceremony both should support that motion. The CTA at the end of the ceremony ("Want to tune something?" → Swells / Motions / Skip) is this principle made literal: the ceremony ends by inviting the user across the bridge from reflection to adjustment.

### Why first-time-only locks

PROJECT.md is explicit that Onduler optimizes for retention through joy, not through guilt — "if a feature makes the user feel watched, judged, or behind, it doesn't ship." A perpetually-gating system would violate that. But a *first-time* lock is a different shape: it teaches the temporal rhythm of the app for one cycle, then trusts the user with the surface forever. By the time someone has unlocked all four cadences, they've internalized that Onduler is a long-game tool, and the unlock pattern is the teacher.

The locked page being a *vibe-only anticipation surface* is what converts the gate from restriction into anticipation. A blurred radar silhouette, moving tide lines, glimpses without numbers, soft copy — that's a designed artifact, not a paywall. Waiting becomes its own surface. The user gets something every time they tap into Reflections during the lock, even before the ceremony unlocks.

The engagement floor (3 / 8 / 25 / 80 days logged) is what protects against the dormant-user case: someone who installs the app, ignores it for a year, then logs once shouldn't have everything unlock from a single tap. The floor is calibrated to "demonstrated engagement in the cycle being reflected on," not just "time elapsed." Combined with the calendar-anchor requirement (the cycle itself must have completed), the rule is: *you've experienced one full calendar instance of this cadence, AND you've logged on N days during your time as a user*.

Calendar anchoring (rather than user-anchored cycles) is "we're all in time together." Every Onduler user crosses the same Sunday, the same Dec 31. Cycle boundaries are shared in the world rather than constructed per-user. That cohesion is worth the cost of occasional 6-month worst-case quarterly waits (signups in the first days of a quarter wait for the next full quarter to elapse).

### Why one ceremony shape across cadences

The instinct to give each cadence (weekly / monthly / quarterly / yearly) its own bespoke ceremony shape was overbuilding. The MI work — develop discrepancy without judgment — happens in the gap between expectation and observation; the radar is the third-party witness that holds the data so Onduler doesn't have to. Two prompts and a reveal are enough at any cadence. Cadence itself is the depth knob: a week of expectation-gap reads light, a year of expectation-gap reads heavy, automatically.

Scripted MI question banks were the first draft and got rejected. Even the soft variants ("which swell felt most like you this week") presuppose direction — they ask the user to pick from the radar's categories rather than notice their own surprise. Two universal prompts that ask nothing of the user except their own attention to their own expectations honor the celebration-over-judgment posture more honestly. They also scale — the same two prompts work at every cadence with no reauthoring.

The rejected question bank doesn't go to waste — it becomes optional themed prompts available behind the `+` free-form entry button, for users who want shape when they journal off-cycle. Never pushed.

### Why the ceremony fires from the bottom-nav tab itself

The cycle-close moment wants an *invitation*, not a notification or modal. Onduler doesn't have modal demands anywhere else and shouldn't start now. Using the persistent bottom nav as the invitation surface is consistent with the rest of the app: when a cycle closes, the Reflections tab subtly animates (tide-line motion) and the other tabs dim slightly, drawing the eye without demanding anything. The user can tap when ready; the indicator expires when the next cycle rolls (no stacking, no guilt). If they didn't engage, they didn't engage — the previous cycle is still browseable via the period filter, but the ceremonial walkthrough is freshest-cycle-only.

This removes the need for a separate on-demand "Reflect" button, which was an earlier draft. Free-form reflection lives at the `+` button (consistent with Motions and Swells). Ceremonial reflection lives at the tab. The two paths cover the design space cleanly.

### Why wave-cycles get no ceremony

PROJECT.md: "The app's response is to not chase you. We'll be here. Take care of what you need to take care of." If the user logged zero motions across the cycle, there's nothing to reflect on — and asking them to reflect on absence would read as a guilt-collection mechanism. So the ceremony simply doesn't fire on wave-cycles: no indicator, no nudge. The Reflections page shows existing radar with the wave wash, with a soft "we'll be here when you're back on the board" line somewhere quiet. The engagement floor for ceremony-fires is *logged on at least one day in the cycle* — a lighter threshold than the unlock floor, but a threshold.

### Why archive-and-fresh-start lives only behind reflection

PROJECT.md is emphatic that data is sacred ("logs and motions are sacred"). Wipe-or-start-over is a real exception to that, and exceptions need ritual. Placing archive only behind a cycle-close ceremony means starting over is *always preceded by intentional reflection* — the user has just spent a moment articulating what they expected, what they saw, and considering whether to tune something. From inside that moment, the option to archive and start fresh is a coherent next step: "I've reflected; the answer is, I want a different shape entirely." Outside the ceremony, the option doesn't exist — Settings has no "Start over" button. The architectural firewall ("reflect first, then archive") is part of the design.

Reward reflection with a clean slate. The archive ceremony is itself a small celebration — closing a chapter is a meaningful act, not a destructive one. The chapter library in Settings preserves what was. The Reflections surface starts blank and has to re-earn its unlocks, exactly like a new user — because the user just chose to *become* a new user, intentionally.

The new chapter fully re-onboards: build picker, swell selection, motion seeding. They might pick the same shape; they might pick something they couldn't see the first time because they didn't know themselves yet. That's the point.

### Why Today → Motions (with a checkbox icon)

Surface-content noun consistency across the bottom nav: Motions / Swells / Reflections / Settings. Each tab name describes what the page holds, not a temporal slice.

The earlier concern was that "Today" was doing load-bearing framing work — the daily ritual surface, the paper-list aesthetic, the "this is your day" framing — and that "Motions" alone would re-frame the page as motion-management (inviting metadata creep onto the main row, which ADR 0002 specifically forbids). The checkbox icon resolves that: the icon does the temporal and ritual framing more reliably than a word could. A page named "Motions" with a checkbox icon reads as "the verbs you do, today" without saying so in text. The paper-list aesthetic and the daily-ritual positioning are unchanged — only the label and the icon move.

There's an ADR 0002 implication worth naming: "motions are verbs" is a load-bearing teaching pattern, and a noun-shaped page name pointing at a verb-shaped concept creates a small grammatical friction. The friction is acceptable — the icon does the verb-affordance work, and the noun-consistency win on the bottom nav is worth it. Motions-the-page holds motions-the-verbs; the page is a container, not the content.

### Why "skip is always a door" as a principle

The ceremony has multiple skip-points (expectation prompt, observation prompt, tune CTA). Past surfaces have similar optional-input patterns. The principle generalizes: any prompt the app puts in front of the user is skippable end-to-end. This is the celebration-over-judgment posture stated as a UX rule. Worth promoting to a named working agreement so future feature decisions inherit it without re-litigation.

### Why points-as-time-budget is a working agreement, not part of the ceremony

The time-budget framing — "you have a limited amount of time, you're already spending it on something, points let you decide how much each kind of spending matters to your future self" — is the clearest articulation of why the points system exists. It explains why a user should *inflate* the point value of motions they don't enjoy: to economically rebalance present-self's preferences against future-self's values. The frame deserves a named home in PROJECT.md as a working agreement so onboarding pedagogy, marketing voice, and future explainer surfaces can lean on it.

The frame is points-only. Hours mode is the honest mode where time is what it is and the user can't lie to themselves; it doesn't have or need a parallel inflation lever. Users can run both displays in parallel — some will care about one and not the other.

Budget vocabulary lives only in PROJECT.md and onboarding/marketing pedagogy — never as a UI label. The vocabulary lock holds: Tide, Wave, Swell, Motion, Group, Waypoint. "Budget" is a frame, not a vocabulary item.

## Data model additions

Two new tables. Both ship with the Reflections surface implementation, not standalone.

| Table | Key columns | Notes |
|---|---|---|
| `chapters` | id, user_id, started_at, ended_at (nullable), sort_order | A user has exactly one active chapter (ended_at IS NULL) at a time. Archived chapters are immutable. Existing data is implicitly Chapter 1 on first migration. |
| `reflections` | id, user_id, chapter_id, cycle_type (week / month / quarter / year / free), cycle_start (nullable for free entries), cycle_end (nullable for free entries), expectation_text (nullable), observation_text (nullable), did_tune (nullable bool, only for ceremony entries), body_text (nullable, for free entries), prompt_text (nullable, when a free entry started from a themed prompt), created_at, updated_at | Ceremony entries: cycle_start/end + expectation_text + observation_text + did_tune. Free entries: body_text + (optional) prompt_text + (optional) anchor cycle_start/end. Reflections are chapter-scoped so the active Reflections surface only shows current-chapter entries; past-chapter reflections live in the journal alongside their chapter separator. |

Schema-scoping of *existing* tables to chapters (motions, swells, groups, milestones, logs, wave_checkins, user_settings) is an implementation question deferred to the implementation session. Two clean approaches: (a) add `chapter_id` to every relevant table and filter all active queries to current chapter; (b) snapshot the user's full state into a `chapter_archives` JSON blob on archive and clear the active tables. Approach (a) is more flexible; approach (b) is simpler to ship. The behavior requirements are: archived data is preserved and read-only browseable from Settings → Past chapters; the active app only sees current-chapter data; the new chapter starts fully clean.

The `chapters` table being first-class is non-negotiable — reflections are scoped to it, and the chapter library surface in Settings reads from it.

## Working agreements (to add or amend in PROJECT.md)

### Amend: four-surface split

Existing agreement reads: *"Today is the daily ritual surface; Swells is the strategic surface. ... Settings carries one-time configuration. The Logs page carries diagnostics. This four-surface split is how Onduler scales as users invest more without ever becoming exhausting."*

Replace with: *"Motions is the daily ritual surface; Swells is the strategic surface; Reflections is the mirror where you adjust yourself; Settings carries one-time configuration. Each surface plays a distinct role — ritual / strategy / reflection / configuration — and structural complexity belongs on the surface whose role it serves. Today / Log are the prior names of Motions / Reflections (see ADR 0007). New features get evaluated against this split — 'which surface does this belong on, by role?' is a real question."*

The "Today stays paper-light" framing inside that agreement carries forward unchanged but referring to Motions rather than Today.

### Amend: bottom nav

Existing agreement names the four nav items as Today / Swells / Log / Settings. Update to Motions / Swells / Reflections / Settings. Behavior unchanged.

### Amend: paper-list aesthetic

Existing agreement reads: *"Today page is a paper-list aesthetic."* Update the page reference to Motions. Aesthetic and the no-metadata-on-main-row rule carry forward unchanged. The checkbox icon in the bottom nav reinforces this — Motions is where you check things off.

### Add: skip is always a door

*Every prompt, ceremony, or guided flow Onduler puts in front of the user is skippable end-to-end. No required text fields anywhere in the cycle-close ceremony, no forced answers in onboarding, no "you must complete this before continuing." Reflects celebration-over-judgment as a UX rule. When designing a new flow, the first question is: "what does the skip path look like, and does it leave the user in a good place?" If the answer is awkward, the flow needs to be rethought, not the skip removed.*

### Add: points-as-time-budget framing

*Points is the expressive tracking mode where users weight their motivation by inflating the point value of motions their future-self values more than their present-self wants to do (e.g., inflating a workout's points to economically reward the action that earns the joy of the beach photo). Hours is the honest tracking mode where time is what it is — no inflation lever — for users who want literal accounting rather than gamified weighting. Users can display both in parallel; mode is a per-user setting. The time-budget framing — "you have a limited amount of time, you're already spending it on something, points let you decide how much each kind of spending matters to your future self" — lives in PROJECT.md, in onboarding pedagogy, and (eventually) in marketing voice. It never appears as a UI label. Vocabulary lock holds: Tide, Wave, Swell, Motion, Group, Waypoint. Budget is a frame, not a vocabulary item. Inflation is taught in onboarding; a cross-mode tutorial gut-check fires later in the user's lifecycle ("you're tracking in points; here's how hours mode works"). Waypoint bonuses extend the frame internally as windfall income but no budget language appears in waypoint UI.*

## Implications

- **PROJECT.md edits**: data model table gets `chapters` and `reflections` rows; roadmap gets a new "Reflections surface" session entry near the top; Decisions section gets a new entry pointing to this ADR; working agreements amended and added per the section above. Vocabulary table unchanged (Reflections is a surface name, not a vocabulary lock).
- **Bottom nav rename (code work)**: `/log` → `/reflections` route rename; `/log/page.tsx` becomes `/reflections/page.tsx`; bottom-nav component updated for Motions and Reflections labels; checkbox icon swapped in for the Motions tab. URL change is a real break for any bookmarks but acceptable at pre-launch user count (one).
- **Today → Motions rename (code work)**: `/dashboard` or current Today route relabeled to Motions; page name in nav updated; checkbox icon. The underlying paper-list component and behavior unchanged.
- **Cycle-close ceremony (code work)**: new component for the two-prompt + radar-reveal flow. Reuses the existing radar component (frozen, drag-disabled). Wired to a "is a closed cycle awaiting reflection?" query that fires the nav-tab invitation. Indicator expires on next cycle rollover.
- **Locked Reflections page (code work)**: new component for the vibe-only anticipation surface. Blurred radar silhouette (placeholder data), tide-line animation, soft copy. Renders when the corresponding cycle has not yet unlocked for the current chapter.
- **Journal sub-surface (code work)**: new route `/reflections/journal` with a contemplative-register list of reflections, chapter separators, paper-list aesthetic carried through. Each entry is a card: ceremony entries show the closed radar + responses; free entries show body text + prompt header if applicable. Small "your reflections →" preview affordance on `/reflections`.
- **`+` free-form entry (code work)**: top-right `+` on `/reflections` opens a blank entry. Default-anchored to currently-viewed cycle, with affordance to change anchor or set to none. Optional "start with a prompt" — pick from themed bank of the recycled MI questions, organized by theme (notice / honor / consider / release / invite) rather than by cadence. Lightweight.
- **Archive-and-fresh-start (code work)**: only available at the end of a cycle-close ceremony, as a third option below the Swells / Motions / Skip CTAs ("Close this chapter →"). Confirming archive triggers a soft warning naming what's happening, then runs the close + re-onboard flow. Past chapters are accessible from Settings → Past chapters, read-only browseable.
- **After-year-one cadence preference (deferred)**: once all four cadences have unlocked for the user, expose a Settings option for "how often should Onduler invite you to reflect?" with choices spanning weekly through yearly. Requires a notification or prompt system that doesn't exist yet — deferred dependency, not blocking the Reflections surface itself.
- **Quarterly cadence (new)**: calendar quarter (Q1 = Jan–Mar, Q2 = Apr–Jun, etc.). Quarterly target = `ceil(weekly × days_in_quarter / 7)`, same ceil-display rule as monthly. Helpers added to `lib/periods.ts`. Wave-quarter trip on 30+ consecutive zero-log days within the quarter (proposed; defer final threshold to implementation).
- **Schema migration**: introduces `chapters` and `reflections` tables. Existing data is implicitly Chapter 1 — a one-time backfill creates a single chapter row per user and (if approach (a)) populates `chapter_id` on existing rows. No data loss. One-user-at-pre-launch makes this trivial.
- **Memory**: no immediate memory file changes required; the design heuristic memory ("internal skill-tree framing, user-facing surf voice") still applies and the new ceremony is consistent with it. Adding "Reflections" to the locked vocabulary list is not warranted — Reflections is a surface name like Today/Settings, not a model-vocabulary item.

## Alternatives considered and rejected

**Cycle-close gating as recurring restriction.** Considered briefly and rejected. Hard-gating every weekly view until the week closes would be punishment-shaped and conflict with celebration-over-judgment. First-time-only with the locked page as an anticipation surface gets the mystery and the rhythm-teaching without the perpetual fence.

**User-anchored unlocks (count days logged, not calendar).** Considered and rejected. Pure log-count unlocks make the cycles private and disconnected from the calendar, losing "we're all in time together." Also has a dormancy hole: a year-long absence followed by a quick check-in shouldn't unlock everything from a single log. The calendar-anchored + engagement-floor hybrid gets the cohesion of calendar with the dormancy protection of engagement.

**Soft date or engagement-counter on the locked page.** Considered and rejected. Showing "your first weekly reflection arrives Sunday May 24" or "3 of 3 days logged this week" would mechanize the lock surface and remove the anticipatory mystery. Pure vibe-only is the most distinctively Onduler version of the choice. Marketing site explains the pattern for users who want the mechanism.

**Scripted MI question banks at each cadence (10–12 questions per slot, rotated).** First draft of the ceremony. Rejected after sketching. The bank approach baked the MI work into the prompt (each question presupposes a kind of noticing), which forced users into list-shaped thinking. Two universal prompts — *what did you expect / what did you see* — put the MI work into the user's own hands by making them commit to an internal model before the data is shown. Cleaner, scalable across all four cadences, more honest to the no-judgment posture. The rejected question bank lives on as optional themed prompts behind the `+` free-form entry.

**Separate on-demand "Reflect" button on the page.** Considered. Resolved by the tab-as-invitation pattern + the existing `+` pattern: ceremonial reflection lives at the bottom-nav tab; free-form reflection lives at the `+`. No third button needed.

**Different depth at different cadences (more questions, richer display at quarterly/yearly).** Considered and rejected. Cadence itself is the depth knob — a year of expectation-gap is heavier than a week of expectation-gap, automatically, with the same two prompts. Avoiding cadence-specific shapes keeps the ceremony predictable and avoids the maintenance burden of four bespoke flows.

**Today → "Daily Motions" instead of "Motions" alone.** Considered. The "Daily" prefix preserved the temporal/ritual framing in the word. Rejected: the checkbox icon does that work more reliably and "Motions" alone is tighter on the bottom nav (one word, consistent with Swells / Reflections / Settings). The icon is the verb-affordance.

**Today rename rejected entirely; keep Today as the name.** Considered (the first response in the design session pushed this). Rejected after Josh's counter that the icon could carry the ritual framing. The noun-consistency win on the nav and the surface-content-naming pattern (each tab names what it holds) are both real, and the icon resolves the "but Today does framing work" objection.

**Archive available from Settings.** Considered and rejected. Placing archive only behind a cycle-close ceremony enforces that starting over is always preceded by intentional reflection. Settings would let users archive in a rush, which would feel coercive on a future self — the data is sacred precisely because Onduler protects you from acting on a bad moment.

**True wipe (delete all data) in addition to archive.** Considered. Rejected for v1: archive preserves the chapter (data is sacred) and gives the user the felt sense of starting fresh without losing the artifact of who they were. Visual fresh start is achieved by the new chapter looking exactly like a new install. True wipe can be added later if users ask for it; archive is the right default.

**Auto-fire missed ceremonies on welcome-back from a wave.** Rejected. The posture is "we'll be here when you're back" — collecting unattended ceremonies would feel like guilt collection. Missed ceremonies evaporate; past cycles are browseable via the period filter; the user can write a retroactive journal entry from the `+` button if they want.

**Reflections journal inline on the main `/reflections` page (no sub-surface).** Considered. Rejected. The journal earns its own surface as a *library of past selves* with contemplative typographic treatment — a feed mixed below the active radar would degrade both surfaces. The sub-surface at `/reflections/journal` lets the library be designed as an artifact rather than a list.

**Reflections survive chapter close.** Rejected. Past chapter reflections live in the journal alongside their chapter separator (so the journal is the only place all reflections across all chapters live together), but they don't follow the user into the active Reflections surface of the new chapter. Reset like a new user means *truly* reset — the active surfaces look exactly like a fresh install. The chapter library in Settings is the access path.

## Origin

Decision reached in a Cowork design session on 2026-05-18. The original prompt: "we should have the logs page act as its own reward. It isn't useful at weekly view until a full week has happened... we could add quarterly and yearly as well." From there the design evolved through several iterations:

- First proposal (Claude): hard-gate every cycle's view perpetually. Pushed back: would conflict with celebration-over-judgment.
- Counter (Josh): first-time-only unlock, with mystery as a one-time-teaching pattern. Adopted.
- Iteration: scripted MI question banks for the ceremony at each cadence. Rejected by Josh on first reading — "too closed, they would just list swells."
- Counter (Josh): two universal prompts — *what did you expect to see / what did you see* — with the radar as the third party between them. Adopted. This is the load-bearing simplification of the whole design and the move that made the ADR shippable.
- Naming: Log → Reflections (Josh, midway). Today → Motions with checkbox icon (Josh, near the end).
- Architecture: persistent reflections journal as a sub-surface library (Claude proposal, Josh adoption with the constraint that it has to look beautiful or it isn't worth it).
- Engagement floors: 3 / 8 / 25 / 80 days logged for weekly / monthly / quarterly / yearly. Calendar-anchored cycles. Both proposed by Claude, adopted by Josh with the explicit "we're all in time together" rationale that locked calendar over user-anchoring.
- Working agreement: skip is always a door (added late in the session, generalized from multiple specific skip-points).
- Working agreement: time-budget framing (separate decision in the same session, lifted from Josh's "budgeting for joy in your life, your cash is time" articulation).

Implementation queued as its own roadmap session, pulled to the top of the roadmap.
