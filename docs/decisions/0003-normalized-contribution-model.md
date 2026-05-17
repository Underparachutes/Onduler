# 0003 — Normalized contribution model: a motion's swell contributions sum to ≤100%

**Status:** Accepted
**Date:** 2026-05-17

## Decision

Change the contribution model for `motion_swells.contribution_weight` from **additive** to **normalized**. A motion's contributions across all the swells it feeds must sum to ≤100% (not >100%, as today's model permits).

Concretely:

- A motion with one swell link defaults to `contribution_weight = 100`. Unchanged.
- Adding a second swell to a motion opens an allocation slider. The motion's existing 100% redistributes — the user drags to set the split (e.g., 70% to swell A, 30% to swell B). The total stays at ≤100%.
- Editing one swell's allocation **auto-rebalances** the other swell allocations on the same motion, proportionally, so the total stays unchanged. Dragging Movement up from 60% to 80% automatically decreases the remaining swells from a combined 40% to a combined 20%, distributed proportionally across them.
- The motion detail sheet shows an allocation indicator: `100% allocated · X% remaining`. Unallocated capacity is permitted (a motion can sit at 80% Movement and 0% elsewhere); over-allocation is not.
- Schema is unchanged. `motion_swells.contribution_weight` keeps its meaning as "percent of this motion's value flowing to this swell." The sum constraint is enforced in the app layer (and optionally in a DB trigger later).
- Existing rows are renormalized once when this ships — for any motion whose links sum to >100%, scale them down to sum to 100%, preserving relative proportions. Acceptable because there is one user and one week of real data; no production migration plan needed.

This supersedes the bits of ADR 0002 that describe contribution_weight as a free additive multiplier (specifically, the implication that a motion can dispense more than 100% of its base value).

## Why

**The additive model dispenses more credit than the action contains.** Under today's model, a meditation worth 3 base points can contribute 100% to Mind and 40% to Family at the same time — dispensing 4.2 points of total swell credit for a single 3-point action. The math is generous but conceptually fuzzy. "Where did my 15 points of meditation go this week?" has no clean answer; it depends on how many swells the motion is hooked to and how aggressively the user weighted each link.

**Targets become squishy under the additive model.** A weekly target of 100 pts on a swell is supposed to mean "100 pts of effort flowed into this swell." Under the additive model, that 100 pts might represent 70 pts of "real" effort if most contributing motions are also feeding other swells at high weight. The user can't reason about it. Under the normalized model, 100 pts on a swell means exactly 100 pts of motion-time-weighted credit reached it, no inflation.

**The normalized model matches the mental model users already have.** When someone says "I'm splitting my morning routine between Movement and Mind," they're describing a division, not a duplication. The additive model encodes "the same thing fully counts twice." Most users don't think that way; they think in shares. Aligning the math to the mental model removes a layer of explanation the product otherwise has to teach.

**Cleaner foundations for builds.** ADR 0004 introduces builds/shapes, which propose specific motion→swell links with specific splits (e.g., "Yoga → 60% Movement, 40% Mind"). The build's recommendations have to mean something consistent. Under the additive model, "60% / 40%" is just a flavor — the user could also set "100% / 100%" and the system shrugs. Under the normalized model, the build's percentages are absolute and meaningful, and the math composes predictably when builds are blended (multi-classing) later.

**The lost generosity is mostly noise.** The additive model's strength was letting a single action "fully count" toward multiple swells. In practice, that strength is a measurement artifact, not a real reflection of the action. A morning meditation isn't actually two full meditations because it also happens to feed Family. It's one meditation, split. The product can stop pretending otherwise.

## Alternatives considered and rejected

**Keep the additive model, just default new links to 100%.** This is the current ADR 0002 stance. Rejected because the underlying squishiness remains: targets stay un-reasonable-about, the build's percentage suggestions stay flavor-only, and the user is left without a coherent "where did my points go" answer at higher complexity.

**Hard cap each motion link at 100% individually, no sum constraint.** Rejected. Doesn't solve the inflation problem; only prevents one link from being weighted above 100, which is already implicit in the slider UI.

**Cap on credit *received* per swell instead of credit *dispensed* per motion.** Rejected. Receivers being capped breaks the additive points model in the wrong direction (the user does work that "doesn't count" past a ceiling). The right place to enforce the constraint is at the source — each motion is worth exactly itself, distributed.

**Auto-equal-split on adding a second swell instead of auto-rebalance on edit.** Rejected as the *only* behavior; adopted partially. Adding a second swell could default to 50/50, but the user almost always wants a non-equal split, and the auto-rebalance-on-edit pattern matches familiar mixer/slider conventions better than "you must rebalance from a 50/50 start every time." We may default to placing the new swell at 0% and letting the user drag to take from the existing allocation — that's a UX detail to settle when building.

## Schema

No schema change. `motion_swells.contribution_weight` retains its column shape and meaning. The constraint is app-enforced in the motion detail sheet UI and in any future build-application code paths.

A DB-level `CHECK` constraint (sum of `contribution_weight` for a given `motion_id` ≤ 100) is feasible later via a trigger or a generated column but is not required for v1.

## Implications

- The motion detail sheet's swells chip-assignment surface needs an allocation slider with a "X% remaining" indicator. Auto-rebalance logic lives here.
- The build picker (ADR 0004) emits motion suggestions with explicit per-swell splits, not "add to both at full."
- All swell-progress aggregation paths (swells page, log page, weekly progress bars) already use `contribution_weight` as a percentage multiplier — no math changes needed there, but the *values flowing in* will be smaller for multi-swell motions, so the visible weekly progress will move more slowly per log.
- Weekly target defaults (currently 100 pts/week or 5 hrs/week) likely want re-tuning downward once this lands, since less credit flows per motion. Defer the re-tune until we have a few weeks of normalized data to look at.
- A one-time renormalization runs when this ships: for each motion, if `SUM(contribution_weight) > 100`, scale all that motion's link weights so they sum to 100, preserving proportions. Motions summing to ≤100% are left alone.
- PROJECT.md "Decisions" section needs a summary entry pointing at this ADR. The ADR 0002 stance on contribution_weight defaults stays correct (new links still default to 100%); only the "additive, can exceed 100%" semantics are superseded.

## Origin

Decision reached in a Cowork design session on 2026-05-17, as part of a broader brainstorm on RPG-style builds (ADR 0004). The contribution model came up because builds need to propose multi-swell motions with specific splits, and the additive model didn't give those splits stable meaning. Josh proposed the normalized cap directly. The auto-rebalance-on-edit behavior emerged from working through what editing one swell's % should do to the others on the same motion — a mixer-style interlock felt natural and removes the need for the user to do the subtraction themselves.
