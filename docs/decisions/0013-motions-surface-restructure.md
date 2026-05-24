# 0013 — Motions surface restructure (Filter, Views, drag-between-swells, Duplicate, toast undo)

**Status:** Accepted
**Date:** 2026-05-24

## Decision

The Motions surface (the daily ritual page reached from the bottom-nav checkbox tab) gets a coordinated restructure across header controls, interaction model, and a new opt-in week-editing mode. Six sub-decisions, all spec'd here, ship together because they share the same row component and toolbar:

1. **Header controls collapse to two icon buttons** — Filter (right) and Views (left) — replacing the current two-row toggle stack (`By swell / Default view` + `Hide done / Show all`).
2. **Filter button** opens a small popover with three checkboxes: *Show completed*, *Show swells*, *Hide pts/hrs*. New defaults: hide completed, hide swells, show pts.
3. **Views button** opens a Week-edit mode — per-motion weekly day-boxes for retroactive log editing across a two-week window, with horizontal swipe between weeks.
4. **Checkbox becomes drag-only.** Tapping the checkbox no longer logs the motion; it is purely the drag activator (long-press). Logging happens by tapping anywhere else on the row.
5. **Drag-between-swells in by-swell view** moves a motion's swell membership from source to target swell. Cross-swell drags fire a toast: *"Moved Read from Movement to Mind. Undo · Keep both."* Same-swell drags are silent reorder. Drag to Unassigned strips all swells with its own undo toast.
6. **Duplicate motion** action in the motion detail sheet creates a sibling motion (same name with "(copy)" suffix, same pts/hrs, same group, *empty* swell links — user picks the destination swell on the new row).

The paper-list aesthetic is preserved: Week-edit mode is opt-in only, never the default. Default landing remains the flat checklist that ADR 0004's "Today page stays sacred" working agreement protects.

---

### 1. Header restructure

The existing two-row toggle stack is removed. In its place: a single header row with **Views** (calendar icon) on the left and **Filter** (filter funnel icon) on the right, plus the date/score block in the center. The group-filter chip row stays where it is (below the toolbar, when buckets are enabled — see ADR 0012).

Both icon buttons follow the canonical press-feedback rule (`active:scale-[0.97]`, 0ms — cross-page-style, since they shift the page's mode rather than acting in place).

When Views mode is active, the Views icon switches to an active fill state (matching the toggle-active contrast pairing from earlier sessions: `bg-th-text text-th-bg`). When Filter has any non-default option toggled on or off, the Filter icon gets a small dot indicator (top-right corner, 6px, `bg-th-accent`) so the user can see at a glance whether the list they're looking at is filtered.

### 2. Filter popover

Tapping Filter opens a compact popover anchored under the Filter icon. Three checkboxes:

| Option | Default | Behavior |
|---|---|---|
| Show completed | **off** | When off, logged motions hide from the list. When on, they remain visible with the done visual (checkmark, line-through, opacity drop). |
| Show swells | **off** | When off, list is the flat default. When on, motions are grouped under per-swell sections (the existing By-swell view), including an Unassigned section for orphans. |
| Hide pts/hrs | **off** | When off, each row shows its `default_points` (or `default_hours` in hours mode) on the right. When on, the value chip is hidden — the row reads as a pure to-do item. Useful for users who want the checklist density without the budgeting frame. |

Filter state persists in `localStorage` keyed by user (same pattern the current `bySwell` toggle uses). The popover dismisses on outside tap, on selection (the checkbox flips, the popover stays open until the user taps outside — they may want to toggle multiple options), or on a system-back gesture.

### 3. Views — Week-edit mode

Tapping the Views icon switches the motions list into a per-motion weekly grid. Each motion row reshapes from a single-tap checklist row into a row with seven day-boxes (Sun–Sat) running across the right side of the row.

**Two-week window with horizontal swipe.** The default landing is this week (Sunday-anchored, matching the swells cycle). A left-swipe gesture reveals last week; right-swipe returns. Swipe is the only navigation — no nav arrows, no week label dropdown. A small week label sits above the grid ("This week" / "Last week") so the user always knows which week they're editing. Two weeks is the hard cap for v1; older weeks are not editable here. Infinite scroll backwards is a future enhancement deferred until tester signal demands it.

**Day-box display rules:**

| Day state | Box display | Tap behavior |
|---|---|---|
| 0 logs | empty | adds 1 log at noon Pacific that day |
| 1 log | checkmark (`✓`) | removes that day's log |
| N logs (N>1) | count chip (`N×`) | removes the *most recent* log (count decrements; visual reverts to `✓` when N=2 becomes 1) |
| (any state) long-press | n/a | opens a per-log detail popover for granular delete (lists logs with timestamps, each with its own delete affordance) |

The long-press is the escape hatch for users who need to delete a *specific* log on a multi-log day rather than just popping the most recent. For 95% of users on single-log/day motions, the count-chip never appears and the long-press is never reached.

**Submotions flatten with indent.** In Views mode only, every parent's children render as their own indented rows directly below the parent, each with their own seven day-boxes. This lets the user edit per-submotion days independently — the whole point of opening Views mode in the first place. Parent rows still show, with their own day-boxes that follow the per-parent `submotion_mode`:

- `distribute` (Split) parents: parent day-box shows the *parent-level aggregate* (a check appears on the parent when any submotion is logged that day; count appears for multi-log days summing children's logs). Tapping a parent day-box is disabled — submotions are the editable layer, the parent is read-only-aggregate. Visual: parent day-boxes render at lower opacity to signal read-only.
- `rollup` (Full) parents: parent day-box is independently editable (a log on the parent is a log on the parent). Submotions are still independently editable. Both surfaces are live.

This collapses the existing Split/Full mode distinction into the views grid without introducing a new UI concept — the per-parent mode already determines whether parent and submotion logs are independent (Full) or accounting-aggregated (Split).

**Add Motion from Views mode.** A small `+ Add motion` row sits at the bottom of the motions list in Views mode (only when in Views — flat mode keeps its existing `+` affordance in the top-right of the page). Tapping invokes the existing keyboard-takes-over add-motion form. After save, the new motion lands as a row in Views mode with its day-boxes empty. The user then taps any day-box to backfill a log on a past day — solving the "I missed Friday and did Yoga but Yoga isn't a motion yet" case without inventing a new flow.

**Filter interaction inside Views mode.** Filter options still apply:
- *Show completed* off: a row whose *current week* has any log appears unchanged (Views mode shows the grid regardless of completion — the user is editing days, not toggling a single state). Effectively, "completed" doesn't have meaning in Views mode the way it does in flat mode; Filter's *Show completed* toggle is functionally inert here. Render the option as disabled (grayed-out with the current value still visible) so the user understands why it's not acting.
- *Show swells* off: flat per-motion list with day-boxes. *Show swells* on: per-swell sections, each section's motions with their day-boxes. Both work.
- *Hide pts/hrs* off: the value chip sits to the right of the motion name (before the day-boxes). On: chip hidden, day-boxes shift left to fill the space.

### 4. Drag-between-swells with toast undo

ADR 0004's by-swell view already shows the same motion repeated under every swell it feeds. Drag interactions in by-swell view now have semantic intent:

**Same-swell reorder** (drag within one swell section): silent — updates `motions.sort_order` per the existing "fill section slots in the global list" pattern. No toast.

**Cross-swell drag** (drag from Swell A's section to Swell B's section): the motion's swell membership *moves* — the link to A is removed, a link to B is created at the same `contribution_weight` (or 100% if A was the only swell). The action completes immediately. A toast slides up from the bottom for 4 seconds:

> *"Moved Read from Movement to Mind. **Undo** · **Keep both**"*

- **Undo** reverts the membership change atomically (re-adds A's link at its previous weight, removes B's link).
- **Keep both** also reverts the move *and then* invokes the Duplicate flow (see §6): a sibling motion is created with the same pts/hrs, named "Read (copy)", with B as its only swell at 100%. The original keeps feeding A unchanged. The user is left with two rows, one feeding each swell, ready to be renamed if they want.

Toast dismisses on tap-outside, on Undo/Keep both selection, or on timeout. Only one toast at a time — a second cross-swell drag during the first toast's window dismisses the first toast and starts a new one (no stack).

**Motions feeding multiple swells.** A motion already feeding A+B+C, dragged from the A section into Swell D's section: A's link is dropped, D's link is added at A's previous weight. B and C are untouched. The dragged instance read as "remove from this section, add to that section" — same mental model whether the motion had one swell or several.

**Drag to Unassigned** (drag from any swell section into the Unassigned orphan section): all swell links for that motion are removed. The motion becomes an orphan, surfaces in the "Not feeding any swell" diagnostic on the Swells page. Toast:

> *"Read now feeds no swells. **Undo**"*

Undo restores all previous swell links and their weights atomically. No "Keep both" affordance here — the action is "I want this motion to feed nothing," and the alternative is just "don't do that."

**Toast styling and placement.** Bottom of viewport, above the bottom nav (`bottom: calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)`). Centered horizontally, max-width matches the content column. Background `bg-th-text text-th-bg` (inverted from the page — matches the toggle-active pattern). Buttons inline, separated by middle-dot. Slides up with `transform: translateY(0)` from `translateY(100%)`, 200ms ease-out. Dismisses with the reverse. Wide-screen (md+) inherits the same placement; the toast sits above the bottom edge of the content column, not the viewport.

### 5. Checkbox becomes drag-only

The current state (May 2026 polish): the motion-row checkbox is the long-press drag activator, *and* tapping the checkbox area also logs the motion (because the row's `onClick` fires anywhere on the row, including the checkbox).

The new state: tapping the checkbox does nothing. Long-press on the checkbox is the drag activator. Logging happens via tap on any other part of the row.

Two reasons for the change:
1. Caret-collision (see §6 below): when a motion has submotions, the expand affordance currently lives in a position that's easy to mis-tap into a log action. Removing the log-on-checkbox-tap behavior frees the row geometry for a cleaner caret placement.
2. Drag discoverability: if the checkbox does nothing on tap, users who tap it discover the drag affordance faster (they try long-press as the obvious next thing).

The row's done visual (checkmark fill in the checkbox, line-through on the name, opacity drop on the value chip) stays — the user still sees the logged state when looking at the row. The visual *change* fires when the row body is tapped, not when the checkbox is tapped.

**Caret placement when submotions exist.** With the checkbox no longer a log target, the expand-submotions caret moves to the right side of the row, sitting next to the edit affordance (kebab or edit icon, whatever the current pattern is — leave as-is). Tapping the caret expands/collapses the submotion list without triggering a row log.

### 6. Duplicate motion

A new **Duplicate** action lives in the motion detail sheet, immediately above the existing Delete two-tap control. Tapping Duplicate:

- Creates a new motion in the same group with the original's name plus " (copy)", same `default_points`, same `default_hours`, same `submotion_mode` (NULL if the original was a child).
- The new motion has **no** swell links — empty `motion_swells` rows.
- Optimistic insert into the dashboard list at `sort_order = original.sort_order + 1` (sits directly under the original).
- The detail sheet closes and a small toast confirms: *"Duplicated Read. **Edit**"* — tapping Edit opens the detail sheet on the new motion so the user can rename, retarget swells, and adjust pts/hrs.

The empty-swell-links default is deliberate: Duplicate is the "I want a parallel motion in a different swell" path, and pre-filling the original's swells would defeat that — the user would have to deselect before reselecting. Empty starts them at the natural next step.

Duplicate also fires from the "Keep both" affordance on the cross-swell drag toast (§4), but in that case the swell links are *not* empty — the new motion is auto-anchored to the drag's target swell at 100%.

---

## Why

**Filter + Views collapses two overlapping toolbars into one clean header.** The current state — two stacked toggle rows plus the bucket-filter chip row — is dense, and the toggles have inconsistent affordances (`By swell` and `Hide done` look like they should compose but don't visibly indicate that they can both be on). A Filter popover handles the booleans, a Views button handles the mode switch. Both follow established platform patterns (Mail-style filter, Calendar-style mode toggle) so the affordances are recognizable without teaching.

**The new defaults (hide completed, hide swells, show pts) match the daily ritual.** A morning user opening the app wants to see what they haven't done yet, in a flat list, with their points budget visible. The current default has By swell off, Hide done on, and the pts always-on — that's already two of three matching the new defaults. The change is making the "show this stuff" surface explicit and toggleable instead of buried in mental defaults.

**Views mode is the editing surface the app has been missing.** The app currently has *no way* to retroactively log a missed day. The week-edit grid is the natural shape — checkboxes per day, swipe between weeks, edits land directly on the underlying log rows. It belongs on Motions (not Anchors or Swells) because the action is "fix the record of what I did," and the row of motions is the natural index.

**Opt-in only protects the paper-list aesthetic.** The working agreement that Motions stays paper-light (PROJECT.md, "Motions page is a paper-list aesthetic") would be violated if Views were always-visible per-row. Hiding the grid behind a toggle preserves the ritual surface as-is for users who never open Views, while giving the user who needs to fix Tuesday a clean editing surface.

**The toast pattern beats the modal pattern for cross-swell drag.** A modal-on-every-drag teaches new users but exhausts power users. A no-modal silent-move is fast but loses mistakes. A toast lets the action complete (fast for everyone), names what just happened (teaches by reading), and offers both Undo (recover from mistakes) and Keep both (the alternative interpretation, exposed when the user is most likely to want it — right after they performed the action). The "first-time only" modal alternative was rejected because Undo stays useful forever; teaching once means losing recoverability once "learned."

**Checkbox-as-drag-only fixes the collision the previous polish batch couldn't.** The May 21 polish moved drag onto the checkbox but kept tap-anywhere-logs. That left the checkbox as both a drag handle and a log target, which works fine in isolation but collides with the submotion expand caret (when submotions exist, the caret had to live somewhere safe, and the row was running out of safe). Separating the checkbox (drag only) from the row body (log only) gives the caret a clean home on the right side.

**Duplicate is the missing tool the cross-swell drag exposed.** Once drag-between-swells *moves* a motion (not adds it), the user needs a way to *add* a motion to a second swell without the rename-and-re-tag overhead. Duplicate is that tool. The "Keep both" toast affordance is the contextual entry point that teaches it; the detail-sheet action is the always-available entry point for users who already know the pattern.

---

## Alternatives considered and rejected

**Always-modal drag confirmation.** Every cross-swell drag pauses with "Move or duplicate?" Rejected for the friction reasons above. Power users would learn to dread reordering.

**First-time-only drag modal with "don't show again."** Considered seriously. Rejected because Undo and Keep both are useful forever, not just at first encounter. Toast covers the teaching case without losing the recovery case.

**Per-log row in Views mode (every log a separate visual row).** Josh's first instinct. Rejected because multi-log days create N visually-identical rows for the same motion, breaking the paper-list density. The count-chip-with-long-press pattern delivers the same expressive power in a fraction of the screen space.

**Three-week or month-window Views.** Rejected for v1. Two weeks covers the realistic editing use case ("I missed Tuesday" / "I missed last Thursday"). Wider windows balloon the swipe distance and load more log rows per view. Easy to expand later if testers want it.

**Editable past-cycle weeks (anything earlier than last week).** Rejected for v1. Edits to weeks two-or-more-ago risk retroactively rewriting closed-cycle anchors (the radar reveals on the cycle-close ceremony are frozen-at-close — editing logs that fed them desynchronizes the visual from the data). Two-week window keeps Views inside the still-current and just-closed cycles, avoiding that desync until a properly thought-out spec for retroactive history editing arrives.

**Views as a third top-level tab (alongside Motions / Swells / Anchors / Settings).** Rejected. Views is a *mode of Motions*, not a separate surface — the data, rows, and edit operations are all the same. A separate tab would duplicate the motion list and force the user to learn a redundant navigation pattern.

**Duplicate as a row-level swipe action instead of a detail-sheet action.** Considered. Rejected because (a) the Motions row already has the long-press-checkbox-to-drag interaction and a swipe-action would crowd the gesture space, and (b) Duplicate is a deliberate action, not a fast one — surfacing it inside the detail sheet (where the user is already in editing mindset) is the better location. The "Keep both" toast affordance covers the in-flow duplicate case.

**Restoring the May-21 tap-checkbox-also-logs behavior with a different caret placement.** Considered. Rejected because every placement of the caret was either (a) too close to the checkbox (mis-tap risk) or (b) too close to the kebab/edit affordance (different mis-tap risk). The clean fix is taking the log-target off the checkbox entirely.

---

## Implications

### PROJECT.md updates

- **Current state of the build** gains a line summarizing what this ADR ships once it lands (header restructure, Filter popover, Views mode, toast pattern, Duplicate, checkbox-as-drag-only).
- **Working agreements:**
  - Add a *Toast undo pattern* working agreement: "Cross-swell drag, drag-to-unassigned, and other recoverable destructive actions complete immediately and surface a bottom-of-viewport toast with Undo (and contextual secondary affordance where applicable). 4-second timeout. Single toast at a time. Inverted contrast (`bg-th-text text-th-bg`)." This generalizes the pattern beyond Motions so future surfaces follow it consistently.
  - Update the *Motions page is a paper-list aesthetic* working agreement to acknowledge Views mode as the documented opt-in exception: "Default mode stays paper-light. Views mode is the editing surface, opt-in behind the calendar icon, never default."
- **Roadmap**: this ADR is its own session — call it "Motions surface restructure" — sized as a medium-to-large session given the six sub-decisions. ADR 0012 (Buckets) can ride along as the string-replacement pass since both touch the same surface and toolbar.

### Schema

No new tables. No new columns. The Views mode operates entirely on existing `logs` rows (insert at noon Pacific for day-add, delete for day-remove). The `motion_swells` junction handles drag-between-swells with existing weight column. `motions.submotion_mode` already exists for the Views mode parent-row behavior. `user_settings` already supports the per-user toggle prefs via `localStorage` (no DB column needed for the Filter state — same pattern as the current `bySwell` toggle).

### Code work, by area

**Header / toolbar (medium):**
- Delete the two existing toggle rows on the Motions page header.
- New `<MotionsToolbar>` component with Views icon (left), date/score (center), Filter icon (right). Press feedback per canonical rules.
- New `<FilterPopover>` component with three checkboxes; localStorage persistence; outside-tap dismiss.
- Filter-applied indicator dot on the Filter icon when any non-default option is set.

**Views mode (large):**
- New `<MotionsViewsMode>` component, rendered when Views is active.
- Per-row `<MotionWeekRow>` with seven day-box cells.
- Day-box state derivation from `logs` (count per day per motion, Pacific day key).
- Tap handlers: add log at noon Pacific (empty → 1), delete most recent log (N → N-1).
- Long-press handler: open per-log detail popover.
- Horizontal swipe gesture for week navigation (use react-use-gesture or equivalent — same library if any already in the project, otherwise pick the lightest option). Two-week cap.
- Submotion flatten-with-indent rendering; parent day-box read-only-aggregate when `submotion_mode = 'distribute'`, independently editable when `'rollup'`.
- "+ Add motion" row at bottom; invokes existing keyboard-takes-over `<AddMotionForm>`; after save, list re-renders with the new motion's day-boxes empty.

**Drag-between-swells (medium):**
- Modify by-swell `<DndContext>` handlers to detect cross-swell drops.
- On cross-swell drop: optimistic `motion_swells` update (remove source link, add target link at source's weight), dispatch toast.
- On drop into Unassigned section: optimistic `motion_swells` delete-all-for-motion, dispatch toast.
- On same-swell reorder: existing path, no toast.

**Toast infrastructure (small, but new):**
- New `<ToastProvider>` and `useToast` hook (or equivalent — single global toast queue, depth=1).
- `<Toast>` component with optional secondary action.
- Animation per spec (slide up, 200ms ease-out).
- Place provider in root layout so toasts work across pages.

**Checkbox-as-drag-only (small):**
- Remove the log-on-tap handler from the checkbox; keep only the long-press drag activator.
- Move the submotion expand caret to the right side of the row when `parent.has_children`.

**Duplicate motion (small):**
- New `duplicateMotion(motionId, { withSwellLinks?: { swellId, weight } })` server action: insert new motion row, optionally insert a single `motion_swells` row.
- Duplicate button in `<MotionDetailSheet>` above Delete.
- Confirmation toast with Edit affordance (deep-links to `<MotionDetailSheet>` on the new motion).
- "Keep both" toast affordance from cross-swell drag wires to this action with the target swell pre-filled.

**Bucket rename (ADR 0012):**
- Ride along as the string-replacement pass — covered in ADR 0012's implications.

### Migration

None. All changes are application-level. Default Filter state for existing users matches the current behavior closely enough (Hide completed is already the default; By swell defaults to off — same as the new "Show swells" default; the pts visibility was always on — same as the new "Hide pts/hrs" default off) that no per-user state needs initializing.

### Pairings

- **Ships paired with ADR 0012** (Buckets rename) since both touch the Motions header and chip rows.
- The Bucket-filter chip row keeps its current position below the toolbar; rename only affects its label.

### Future enhancements deferred

- Editing weeks earlier than last week (older-history editing surface).
- "Hide pts/hrs" persistence per-swell (currently global) — wait for tester signal.
- Bulk-edit operations in Views mode (select multiple days, apply once) — wait for tester signal.
- Keyboard shortcuts in Views mode on wide-screen — wait for tester signal.

---

## Origin

Decision reached in the Cowork strategy session 2026-05-24. Started as a punch-list of polish edits ("bunch of random thoughts: Onduler édits 2") and converged through several rounds of pushback on the cross-swell drag interaction and the multi-log day rendering. The toast pattern came in as a third option after the popup-vs-no-popup framing was identified as a false binary. The count-chip pattern came in as a third option after the per-log-row framing was identified as breaking paper-list density. Both alternatives landed because the user was open to being pushed back on the initial framing — the pattern of "name the tradeoff, propose a third option" worked, and the resulting ADR is materially better than either initial sketch.
