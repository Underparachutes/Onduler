# 0004 — Builds and the proficiency view: shapes as starting points, swells as proficiency views

**Status:** Accepted
**Date:** 2026-05-17
**Amended:** 2026-05-18 — see ADR 0006. The user-facing word for "Milestone" is **Waypoint**. The schema table remains `milestones` and code identifiers stay unchanged; references to "Milestone(s)" in this ADR are still accurate as schema/internal language, but user-facing copy uses "Waypoint(s)."

## Decision

Onduler adopts an RPG-skill-tree-influenced model for how users orient their week, internally called a **build**. The user-facing word is **shape** (as in "a maker's rhythm," "your shape," "try a different shape"). This is an internal/external vocabulary split — the RPG framing stays in design conversations and code identifiers; the surf voice stays at the surface.

The decision covers six interlocking pieces:

### 1. Shape presets

Four preset shapes ship as placeholders, each a curated swell mix:

| Internal key | User-facing name | Seeded swells |
|---|---|---|
| `maker` | The Maker | Creativity, Work, Mind |
| `athlete` | The Athlete | Movement, Food, Mind |
| `wanderer` | The Wanderer | Adventure, Movement, Creativity |
| `scholar` | The Scholar | Mind, Work, Creativity |

(Caretaker is dropped for now pending naming work — Caretaker / Healer / Tender / Anchor have not yet landed on a name that fits the surf voice without baggage. Add back pre-launch.)

Presets are starting points, not commitments. Users always retain the "build your own shape" path.

### 2. Onboarding (unchanged)

The existing light pack picker in `OnboardingFlow.tsx` stays as-is — a 2x2 grid of preset chips above the seeded swell list. Picking a pack only toggles which swells are selected. No diff/preview, no motion suggestions, no targets. Onboarding is the right entry surface for the light pack picker because there is nothing pre-existing to disrupt.

### 3. Settings build picker (the diff/preview screen)

The richer build experience lives in Settings, under a "Your shape" surface:

- **Gallery**: current shape shown at top with a mini-pentagon silhouette; secondary-shape slot below (multi-classing entry, slot only for now); preset gallery (2-column cards with small silhouettes); "Build your own shape" link at the bottom.
- **Preview screen**: tapping a preset opens a detail with the full pentagon, description, and a **diff** showing what would change — swells to add, swells to hide, targets to retune. Each change is individually opt-out-able via a checkbox. Nothing gets deleted; at most, swells are hidden (logs, motions, and the swell row all survive).
- **Sub-builds**: tucked behind a "this shape has a few variants" chevron in the preview. Each variant re-tilts the diff. Not in v1; design slot is there.

### 4. Motion-suggestion tray (build expands the menu, never the math)

When a user adopts a shape, the shape may suggest motions appropriate to it (e.g., Caretaker suggests self-care motions, Athlete suggests rest-day motions, Scholar suggests social-time motions). Suggested motions appear in a **tray** the user pulls from, never auto-added to the daily checklist. Pulled motions work like any other motion — same points math, same logging.

The build never changes how *much* a motion is worth. It only changes *what* the user is offered. This keeps the build expansive rather than prescriptive — it broadens the menu of what counts as feeding a swell, without encoding the app's opinion about what *should* be valued more in a given shape.

### 5. Swells page rebuild: each swell is a proficiency view

This is the visually heaviest move and the v1 deliverable of the build-themed work. The Swells page changes from a flat list of swell rows to a per-swell **proficiency view**:

- **Header**: swell name + color dot + this-week tide bar (weekly progress to weekly target) + a small lifetime stat line ("353 hours · 18 weeks running"). No tier badges in v1.
- **Constellation**: the visual center. The swell is a node at center; the motions feeding it are nodes around it. Node size encodes contribution weight; line thickness to center encodes the same (redundant on purpose); node opacity encodes recent activity (vivid = logged this week, faded = quiet). Each motion node shows its log count this week as a small number inside. The center node shows weekly progress (e.g., 12 / 20).
- **Arrangeable**: users can drag motion nodes to reposition them. New schema field needed: `motion_swells.position_x` and `motion_swells.position_y` (numeric, nullable for auto-layout).
- **Cap at 8**: above ~8 motions feeding a swell, only the top contributors (by recent activity) show in the constellation. A "+ N more" affordance at the orbit edge opens a flat, scrollable, sortable list of all motions.
- **List view toggle**: a top-right toggle switches the constellation to a flat list — same data, different presentation. User preference, no state implication.
- **Milestones section** (below the constellation): two subsections, **Recurring** on top and **One-shots** below. Default sort: in-progress / next first, then by recency. Sort options: next due, recently active, oldest first, manual (which unlocks drag handles, mirroring the motions reorder pattern on Today). Completed one-shots collapse by default to a "N finished milestones ↓" expander — trophy case accessible but not loud.
- **Time-view toggle**: a small segmented control near the top (Week / Month / Lifetime). Week is default (the active cycle). Month shows the last 4 weekly bars stacked. Lifetime shows accumulated stats and per-motion lifetime contribution. No tier badges; lifetime is recognition only.
- **Build context footer**: a small "Part of your maker's rhythm" line connects the swell back to the active shape, tappable to the build picker.

### 6. Today page stays sacred

The Today page does **not** change. Paper-list aesthetic. Flat motion checklist. Simple, customizable, welcoming. Nothing about builds, constellations, or proficiency surfaces here. The daily ritual is uncluttered; all structural complexity lives on Swells and Settings.

### 7. Milestones (user-authored, two flavors)

A new entity. Each milestone belongs to a swell.

- **Recurring**: a cadence the user sets (e.g., "publish weekly"). Tracked monthly; partial-ring visual in the milestone list. Hitting cadence celebrates and adds bonus points. Missing fades gently — no failure language, no deficit tracking.
- **One-shot**: a discrete goal (e.g., "start a band"). Marked off manually when achieved. Optionally shows a small progress crumb ("12 piano sessions logged toward this") if the user links it to a motion. Completion celebrates and becomes a permanent marker on the swell's proficiency view.

Milestones are always user-authored. Builds may *suggest* milestone templates ("Wanderers often set a 'finish something' milestone — want one?"), but the user creates the specifics.

### 8. Wave / build interaction

When the user is on a wave, the build is not erased — it is at rest:

- **Logs page lens** (when viewing a wave-week): defaults to **softened** — wave-aware targets are the comparison baseline; the actual log polygon roughly matches; the celebration framing is "hitting these still counts as showing up." A toggle ("Softened / Reference") lets the user flip to the full-strength view, which keeps the original targets on screen and marks the wave window as context rather than scoring it. Default is softened; toggle is exposed because hiding info is the wrong posture.
- **Welcome-back doors** (after WaveGrid check-in on return): two primary options shown as cards:
  1. **Ease back in** *(recommended)* — soft 3-week ramp (40% → 70% → full).
  2. **Pick up your [shape name]** — weekly targets at full, same as before the wave.
  A smaller text link below: *Try a different shape* — opens the build picker. Some waves change the user; that path should exist but not dominate the tender moment.
- **Minimum viable shape**: per-shape "still showing up" anchor — the smallest version of the build that still feels like the user. Anchors are **auto-selected as the user's top 2 most-logged motions** for that shape, with the user able to drop, swap, or add anchors in Settings.

### 9. Logs page (deferred design)

The Logs page becomes the **diagnostic surface** where the user sees their actual week against their shape — the radar/hexagon comparison from the brainstorm mockups. Full design and multi-classing math live here. Out of scope for the v1 build-themed sessions; pulled forward to its own session later.

## Why

**The current model offers no scaffolding for "what kind of week am I trying to have."** Users pick swells and assign points, but the why-this-distribution question is left implicit. Without scaffolding, point allocation feels like guessing. RPG skill trees solved this problem decades ago — opinionated starter builds, clear visual shape, easy respec. Onduler can borrow the mechanics without borrowing the vocabulary.

**Builds are exploratory, never prescriptive — and that's a design rule, not a tone.** The risk of any "we recommend you do X" system is that it tips into judgment about what the user *should* be doing. Onduler's "celebration over judgment" posture (PROJECT.md) is incompatible with a system that quietly grades the user against an archetype. The two firewalls: (a) builds expand the menu of what counts, never weight some motions more than others; (b) every build proposal is individually opt-out-able with full visibility before commit. The user is always the author; the build is a tray of starting points.

**Swells need to carry structural weight that a list can't.** The flat-list rendering of swells works at low complexity (4 swells, 8 motions, 2 milestones) but degrades as users invest more. The proficiency view (Skyrim-influenced constellation) gives swells the visual identity to feel like real things you grow into, not just rows with progress bars. Motions become visible as the things feeding the swell, with weight and recency legible at a glance. The list-view toggle preserves the simpler presentation for users who want it.

**Today must stay paper-light.** All this structural complexity is welcome on the Swells page because Swells is a strategic surface — you visit it to tune your shape, set milestones, see your investment. Today is a daily ritual surface — you tap motion boxes and move on. Conflating them would break the ritual. The two-surface split is the architectural answer to "how does Onduler scale without becoming exhausting."

**Milestones (Skyrim perks) are how daily showing-up accretes into meaning.** The current model rewards weekly target hits, which is great for sustaining the rhythm but offers no long-arc payoff for users investing over months. User-authored milestones — recurring rituals and one-shot goals — connect the daily tap to the band you're building, the 10K you're training for, the manuscript you're finishing. The bonus celebration on milestone completion and the permanent marker on the proficiency view are what turn "I did the motions" into "I built the thing."

**Waves can't erase the build, but can't keep judging the user against it either.** PROJECT.md is firm: a wave is not a failure. The build must inherit that posture. Softening targets, offering a gentle ramp on return, and curating a minimum-viable-shape that's still recognizably the user's build — all of it keeps the user's identity intact while letting the math be merciful. Auto-selecting the wave anchors from the top-2 most-logged motions is the system saying "I noticed what you reach for most; those are your anchors when everything else feels hard."

## Alternatives considered and rejected

**Build-specific motion weight modifiers (e.g., Caretaker rest motions worth more points).** Rejected. Would encode the app's opinion about what each shape values — exactly the prescription Onduler avoids. Builds curate the menu, not the math.

**Replace the onboarding pack picker with the full diff/preview Settings flow.** Rejected. Onboarding has nothing to diff against. The light pack picker is the right shape for an empty starting state; the rich diff/preview is the right shape for an existing user who has invested time and doesn't want to lose what they've built.

**Tier badges (Apprentice / Adept / Expert / Master) on the lifetime view.** Considered and dropped from v1. Tier names risk implying "you need to level up next," drifting toward prescription. May return later with surf-leaning naming (Drift / Current / Tide / Deep / Lifelong) if the lifetime view earns the embellishment.

**Build-affected user-facing copy ("Living like a maker").** Reserved for limited use. The shape is a soft outline on the user's experience; it shouldn't narrate at them. Build-context appears once per swell (the small footer) and once on the build picker. It does not appear on Today, in celebration text, or in empty states. Less is more here.

**Auto-add suggested motions when adopting a shape.** Rejected. Even with opt-out, auto-add clutters the Today page with motions the user might never engage with. The tray pattern keeps the suggestion surface explicit and the daily checklist clean.

**Constellation as the only Swells view.** Rejected. Some users prefer lists; some swells have so few motions that a constellation feels like overkill. Constellation is the default because it carries the proficiency feel; the list-view toggle is the escape valve.

**Two parallel lists (motions on Today + swell-chip assignment on motion detail) as the canonical motion↔swell assignment UX at higher complexity.** Already rejected by this ADR. The chip toggle stays as a quick shortcut, but the canonical home for "what feeds this swell" is the swell's proficiency view — motions visible as nodes, addable/removable from the swell side.

## Schema

Two small additions to `motion_swells`:

```sql
ALTER TABLE motion_swells
  ADD COLUMN position_x REAL NULL,
  ADD COLUMN position_y REAL NULL;
```

Both nullable. NULL means auto-layout. Non-null means the user has manually placed this motion in this swell's constellation.

New table for milestones:

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swell_id UUID NOT NULL REFERENCES swells(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('recurring', 'one_shot')),
  cadence TEXT NULL,            -- for recurring: e.g. 'weekly', 'monthly'
  target_count INT NULL,         -- for recurring: e.g. 4 (per cadence window)
  completed_at TIMESTAMPTZ NULL, -- for one_shot: when marked done
  bonus_points INT DEFAULT 0,    -- points added to swell on hit/completion
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX milestones_swell_id_idx ON milestones (swell_id);
CREATE INDEX milestones_user_id_idx ON milestones (user_id);
```

RLS scopes to `user_id`, mirroring existing tables.

A future addition (not v1): a `milestone_motions` junction so a one-shot milestone can show progress from specific contributing motions (the "12 piano sessions logged toward this" affordance). Out of v1 scope; design notes left for a follow-up ADR.

Build state on the user:

```sql
ALTER TABLE user_settings
  ADD COLUMN primary_build TEXT NULL,    -- 'maker' | 'athlete' | 'wanderer' | 'scholar' | NULL
  ADD COLUMN secondary_build TEXT NULL;  -- same enum, NULL if not multi-classing
```

Slot only in v1; multi-classing math is deferred to the Logs page session (per agreement: a secondary shape is treated as an independent shape whose targets blend into the primary's overall target shape).

## Implications

- **Next session**: Swells page rebuild (proficiency view). Constellation rendering, milestones list, time-view toggle, list-view toggle. Schema migrations for `motion_swells.position_x/y` and the `milestones` table.
- **After that**: Settings build picker (gallery + diff/preview + opt-out + secondary slot + custom path).
- **After that**: Logs page redesign (radar/hexagon comparison, softened/full toggle, wave overlays, multi-classing math).
- **After that**: Wave/build welcome-back doors and minimum-viable-shape configuration.
- **Onboarding**: leave the existing `OnboardingFlow.tsx` pack picker alone. Update only the `ARCHETYPE_PACKS` array (Caretaker out, Scholar in).
- **PROJECT.md**: add `Milestone` to the vocabulary table; add summary entries for ADRs 0003 and 0004 in the Decisions section; reorder the Roadmap so the Swells page rebuild is next; add working agreements covering "builds are suggestions, never prescriptions" and "Today carries paper-list weight, Swells carries structural weight."
- **The existing "Motions not feeding any swell" diagnostic** (shipped May 2026 as a quiet section on the swells page) coexists with the proficiency view rebuild. The section can stay as-is or be absorbed into the rebuild's empty-state pattern — design choice deferred to the rebuild session, no rework required up-front.
- **Contribution model**: ADR 0003 (normalized) is a prerequisite for the build-suggested motion splits to mean anything. The two ADRs are conceptually paired and should ship together when implementation begins.

## Origin

Decision reached in a Cowork design session on 2026-05-17. Brainstorm started from Josh's question about adapting RPG character building to Onduler, traced through preset shapes, the build picker, wave/build interaction, the motion↔swell assignment problem at scale, the Skyrim proficiency-view reframe, milestones, and time views. The four-preset list is a placeholder pending naming work for the dropped Caretaker slot. The Swells-as-proficiency-view reframe (Skyrim model) emerged from the observation that two parallel lists — motions on Today, swells on Swells, with chip-assignment connecting them — would not scale past current usage. Folding motions into swells as a visualization solved the scaling problem and gave swells the visual weight the design needed.
