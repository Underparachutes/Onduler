# ADR 0011: Build deflation — drop user-facing "shape," surface as "Starter sets"

*2026-05-22*

## Context

ADR 0004 introduced the build / shape model: an RPG-skill-tree-influenced framing where users adopt a build (Maker / Athlete / Wanderer / Scholar) that curates suggested swells, motions, waypoint templates, and minimum-viable-shape anchors. The user-facing word for "build" was **shape** — Settings → Your shape, "Pick up your [shape]" on welcome-back, "Try a different shape" link.

In practice, the user-facing layer overclaimed what the mechanism delivers. From the user's seat, the build picker is *just* "here are some curated swells we suggest for someone like you." It does not actually claim that you are a kind of player. The framing of "shape" as identity ("I am a Maker") puts an identity weight on a surface that doesn't earn it and is slightly at odds with Onduler's celebration-over-judgment posture — you are not a type; you are doing the thing.

Independently, ADR 0010 introduces the **wake** as the live actuals-only polygon visual. There's no direct naming collision (wake ≠ shape), but "shape" was inevitably going to get used in design conversation and copy to describe the wake's geometric form. Better to let the geometric word be free for its geometric work and let the build picker be honest about being a utility.

## Decision

Drop **shape** as a user-facing word on the build surface. The Settings tile becomes **Starter sets**. The presets (Maker / Athlete / Wanderer / Scholar) survive as named starter sets — utilities, not identities. The secondary slot drops from UI for now. Internal `build` identifiers stay in code and schema, matching the established internal/external split (`milestones` / Waypoint, `reflections` / Anchor).

### User-facing changes

| Surface | Before | After |
|---|---|---|
| Settings row | "Your shape" | "Starter sets" |
| Settings route | `/settings/shape` | `/settings/starter-sets` |
| Settings sub-page title | "Your shape" | "Starter sets" |
| Onboarding 2x2 picker label | "Pick a starting shape" | *no meta-label* — just the four named chips |
| Onboarding helper link | "Build your own shape" | "Start from scratch" |
| Welcome-back card | "Pick up your [shape]" | "Pick up where you left off" |
| Welcome-back link | "Try a different shape →" | "Try a different starter set →" |
| Build context footer on per-swell view | "Part of your maker's rhythm" | *removed* — line was always quiet and now reads as overclaim |
| Mvs editor section header | "Still showing up" | *unchanged* — already a good name |

### Internal stays

- `user_settings.primary_build` column name
- `user_settings.secondary_build` column name (preserved for re-introduction)
- `lib/builds.ts` module
- `BUILD_PRESETS` / `getBuildById` etc. function and constant names
- Internal RPG-skill-tree design heuristic (PROJECT.md working agreement)

### Secondary slot dropped from UI

The secondary build slot shipped as UI-only in v1 (multi-classing math deferred to the Logs page redesign that never came in the originally-planned form — the wake replaces that surface). With the deflation, the slot loses its concept layer: starter sets don't compose, they're applied as one-shot adds. The UI is removed: the Settings starter-sets page shows only the four presets and the "start from scratch" path; applying a preset is a one-shot diff-and-merge action with no slot persistence.

The `secondary_build` column stays in schema (preserved against re-introduction if multi-classing math lands later). When the column is non-null on an existing user, it's read once on migration and treated as "the user has previously applied this starter set" — informational only, not displayed as a slot.

### Welcome-back / wake interaction

ADR 0004 §8's welcome-back behavior changes incrementally:

- The two-card pair becomes "Ease back in" / "Pick up where you left off" — the build name comes out of the second card's copy.
- The link becomes "Try a different starter set →" — same destination (the Settings starter-sets page).
- The `welcome_back_mode` column and `currentRamp` helper are unchanged. The ramp behavior is unchanged.
- The MVS anchors editor (`StillShowingUpEditor`) is unchanged — it was already named cleanly.
- ADR 0010 adds: a fresh pulsing circle replaces the textured ramp-pill as the visual on the welcome-back card, paired with the "every motion has an impact" copy line. The user re-enters Tide mode and watches their wake form again.

## Why

**The word was claiming more than the mechanism delivered.** "Your shape" implies identity ("I am a Maker"); the mechanism is closer to "we curated some swells for you." That gap made the surface feel like productivity-app rhetoric — exactly the voice Onduler avoids. The deflation collapses the gap.

**It frees up the word for geometric description.** Wake is the new visual primitive (ADR 0010), and while the user-facing words don't directly collide (wake ≠ shape), "shape" was inevitably going to get used to describe the wake's geometric form in design conversation and copy. Better to let the geometric word be free for that work.

**The secondary slot was carrying a concept that never landed.** Multi-classing math was deferred in ADR 0004 §3 and effectively shelved when the Logs page redesign morphed into the Anchors radar without a multi-classing math layer. Keeping a UI slot for a deferred concept is the kind of cruft that gets in the way of new users. Dropping it now (with the column preserved) makes the surface match the mechanism.

**Onduler's celebration-over-judgment posture leans away from identity claims.** Habit apps that frame their users as types ("you're a morning person," "you're a builder") slip easily into telling users who they are — the prescription failure mode ADR 0004 §4 explicitly warns against. "Starter sets" frames the same content as starting points, which is what they always were.

## Alternatives considered and rejected

**Rename "shape" to "rhythm" instead of "Starter sets."** Considered ("a maker's rhythm" appears in ADR 0004's original copy). Rejected: rhythm has a faint productivity-app smell ("find your rhythm!") that "starter sets" doesn't carry. And rhythm still implies a soft identity claim — you *have* a rhythm — which doesn't fix the problem.

**Just call the surface "Your swells."** Considered. Rejected: collides with the `/swells` nav route (the proficiency view) and the bottom nav already says Swells. The user-facing word "Swells" needs to mean one thing only.

**Keep "shape" and narrow what it claims.** Considered. Rejected as too subtle — the word has been live long enough that re-teaching it to mean less would cost more than swapping it for an honest utility word.

**Drop the four presets entirely; let users build from scratch only.** Rejected. The 2x2 onboarding picker is a real conversion accelerator, and the curated swell lists are a real shortcut for users without strong opinions yet. The presets stay; the framing changes.

## Implications

- **PROJECT.md**: vocabulary table is unaffected (Wake is the new term; shape was never a vocabulary entry). Working agreements gain a note that starter sets are utility-flavored, not identity. Decisions section appends a summary. ADR 0004's amendments-at-top get a new line pointing here.
- **Code work**: rename Settings tile and route, swap all user-facing strings per the table above, remove the secondary-slot UI block from the Settings starter-sets page, update welcome-back copy. Bulk: ~20 string changes plus the slot UI removal. Internal `build` identifiers don't move.
- **Database**: no schema change. `primary_build` and `secondary_build` columns stay; `secondary_build` becomes write-once-then-ignore.
- **ADR 0004**: gains a third amendment line pointing to this ADR.
- **Marketing**: no impact. Starter sets don't appear in marketing surfaces; the wake does.
- **Paired session**: code work for this ADR ships paired with ADR 0010's wake — both touch the locked Anchors page and the welcome-back screen, and the welcome-back copy reword depends on the fresh-circle visual landing in the same session.

## Origin

Decision reached in the same Cowork strategy session as ADR 0010 (2026-05-22). The deflation came out of Josh's question on whether to call the wake a "shape" — and the realization that "shape" was already overbooked as a build-picker identity word that claimed more than the mechanism delivered. Rather than rename the wake to something more contorted, the cleaner move was to deflate the build surface to what it actually is.
