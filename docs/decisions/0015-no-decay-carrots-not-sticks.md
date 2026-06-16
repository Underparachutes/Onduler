# ADR 0015 — No Decay: Carrots, Not Sticks

**Date:** 2026-06-15
**Status:** Accepted

## Context

The dominant pattern in gamified habit apps is streak pressure: a visible counter
that resets to zero when you miss, perfect-day bonuses, and "consistency" framed as
an unbroken chain. The category leader people currently reach for in this space,
My OS (myosweb.netlify.app), is built entirely on this model. Its hero stats are
"47-day streak" and "100% week consistency," tasks pay a "+100 bonus for perfect
days," and one of its paid Pro features is a **streak freeze** — a band-aid sold to
patch the exact wound the streak design creates.

This came up because Onduler's Reddit posts (the "Skyrim character build as habit
tracker" framing) drew attention, and the sharpest critique in the threads argued
that some real-life skills genuinely decay when you pivot away from them (skip the
gym for three weeks and you regress), and that streaks capture that reality well.

The question this ADR settles: should any swell or motion progress decay, regress,
or impose a penalty for stepping away?

## Decision

**No decay. No streak penalties. No falling behind.** Progress in Onduler does not
erode when the user steps away. The wave form already models stepping away as a
legitimate, honored mode, not a failure. When the user surfaces, the tide is gentle
and meets them wherever they landed. The app never uses the language of failure,
deficit, regression, or "behind."

We reward consistency with carrots, never punish absence with sticks:

- Consistency is recognized through accumulation (total instances), milestone
  markers, and bonus celebrations — not through a streak that can be lost.
- Missing days produces no penalty, no reset, no decay. The wake hides during a
  wave and reappears the moment the user logs again, without comment.
- Celebration fires when cumulative weekly progress crosses a swell target; the
  cycle reset is a fresh start, never a scoreboard wipe.

This is a deliberate stance, not an oversight. It is the direct answer to "I
bounced off because one bad week erased my momentum," and it is the primary
differentiator against the streak-maximalist competition.

## Rationale

The objection (some IRL skills really do decay) is true about the world but wrong
as a product principle for Onduler. Modeling real-world skill decay would import
the precise dynamic that makes people abandon habit apps: effort starts feeling
like a debt you owe rather than a gain you keep. Onduler optimizes for retention
through joy, not retention through guilt. A user who feels watched, judged, or
behind is a user we have failed, even if the mechanic would lift engagement
metrics in the short term.

Streak freeze as a *paid feature* is the clearest evidence the streak model is
broken: a healthy design would not need to sell users an escape hatch from its own
core loop.

## Consequences

- No `streak` field drives scoring or status. Consistency surfaces are additive
  (total instances, milestones, bonuses), never subtractive.
- No regression math on swells or motions. Progress is monotonic or flat, never
  negative due to absence.
- Copy guardrail: never "you're behind," "streak lost," "X days missed,"
  "get back on track." Re-entry copy is invitational ("want to try knitting
  today?"), per the wave/tide framing.
- This constrains future features. Any proposed mechanic that introduces decay,
  loss, or penalty for absence conflicts with this ADR and must be surfaced as a
  conflict, not shipped quietly.
- The additive consistency mechanic this stance relies on already exists: recurring
  waypoints + the motion-side cadence loop (ADR 0004 §7). A missed recurring cadence
  "fades gently — no failure language, no deficit tracking"; hitting it celebrates
  and adds bonus points; nothing is subtracted. No new surface is needed to deliver
  carrots-not-sticks consistency.

## What we chose not to do

- Streaks as a central mechanic. Rejected. (See the wave/tide core insight in
  PROJECT.md.)
- Streak freeze / streak insurance. Not needed — there is no streak to protect.
- Skill or swell decay over time. Rejected, even where it would mirror real-world
  skill atrophy.
- Perfect-day / perfect-week bonuses that imply imperfect days are failures.
  Bonuses celebrate crossing a target, not maintaining a spotless record.
