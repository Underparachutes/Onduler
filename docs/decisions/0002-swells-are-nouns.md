# 0002 — Swells are noun-shaped life areas, motions are verb-shaped actions

**Status:** Accepted
**Date:** 2026-05-17

## Decision

Reframe Swells from "philosophies the user wants their life to feel full of" to "noun-shaped areas of life the user wants to invest in." Motions remain verb-shaped daily actions. The mental model becomes a sticky one-liner: **Swells are nouns. Motions are verbs.**

The schema does not change. The framing change drives three things:

1. The onboarding prompt for swells becomes a pick-then-add menu of common life areas (Movement, Home, Food, Family, Work, Creativity, Reflection, Travel, etc.) with custom entry as a follow-up, replacing the previously-planned open-ended "What do you want your life to feel like?" question.
2. The default `contribution_weight` on a new motion→swell link becomes 100. The split-across-swells affordance remains available but is not surfaced until the user has at least one link saved. In the noun-shape model, most users leave links at 100% and assign one swell per motion; multi-swell weighting becomes enrichment, not a load-bearing requirement of the model.
3. The user-facing vocabulary stays "Swell." "Domain" remains on the never-use list. The noun-shape framing is an internal teaching pattern and onboarding heuristic, not a rename.

## Why

**The original framing was beautiful but freeze-inducing.** Defining a Swell as "a philosophy the user wants their life to feel full of" reads well in PROJECT.md, but in practice it asks the user to do an hour of self-reflection before they can populate a single swell. The product author (Josh) hit this wall while trying to populate his own swells from a ChatGPT-generated framework with poetic names like "Author your own life" and "Stay alive, not functional" — the abstraction was correct but the labels were too nebulous to organize daily actions against. If the person who designed the spec freezes, real users freeze worse.

**Noun-shaped swells match how people already organize their lives.** Most users have implicit life areas — the categories that show up in their Claude folders, their inboxes, their journals. Movement, Home, Food, Family, Work, Creativity. The first job of onboarding should be to surface these, not to make the user invent novel philosophical frames.

**The verb/noun symmetry is a teaching pattern that snaps the whole model into place.** Telling a new user "Swells are nouns, motions are verbs" gives them a working mental model in one sentence. The previous framing required a paragraph and still left the user unsure whether "creativity" was a swell or a motion.

**The schema already supports both shapes.** A Swell is a row with a name and a weekly target. Whether that name is "Creativity" or "Author your own life" is a labeling choice — the schema is indifferent. This decision is therefore a framing and onboarding shift, not a structural one.

**Weighted contributions become enrichment, not load-bearing.** In the philosophical-swell model, a meditation motion contributing 35% to "Preserve sensitivity" and 25% to "Alive not functional" was central — it was the whole point that motions feed multiple wants. In the noun-shape model, meditation mostly feeds Reflection. The contribution_weight feature is still useful (cook → Food 60%, Family 30%, Creativity 10% is a real enrichment) but it's no longer the load-bearing reason the model works. Defaulting new links to 100% removes the friction of asking every user to think in percentages on day one.

## Alternatives considered and rejected

**Keep the philosophical framing as the default.** Rejected. The author of the spec, with intimate knowledge of the model, could not populate his own swells without coaching. This is a clear signal that the abstraction is too heavy for an onboarding step. A philosophical-swell user can still type "Author my own life" if they want — but the default must not require it.

**Rename Swells to "Areas" or "Domains."** Rejected. The Swell / Wave / Tide vocabulary is part of Onduler's identity and is locked in PROJECT.md. The internal teaching pattern ("swells are nouns") can carry the meaning without changing the user-facing term. "Domains" stays on the never-use list.

**Drop the contribution_weight feature.** Rejected. It still adds real value for users who want it (Cook → Food 60%, Family 30%, Creativity 10% is a richer record than Cook → Food alone). The right move is to default to 100% on first link and expose the split affordance as a secondary action, not to remove the capability.

## Implications

- PROJECT.md vocabulary section: the Swell definition is updated to reflect the noun-shape framing. The weekly-cycle mechanics and Sunday anchor are unchanged.
- PROJECT.md roadmap and the "Swells repeat weekly" decision section: the planned onboarding prompt is updated from "What do you want your life to feel like?" to a pick-then-add menu of common life areas, with custom entry as a follow-up.
- PROJECT.md working agreements: the noun/verb teaching pattern is added as an explicit agreement so it appears in onboarding copy, empty states, and future UI strings.
- Onboarding rework session (next on roadmap): scope shifts from "two open questions" to "noun-shaped swell menu with custom add → motion list per swell." The two-step framing is preserved in spirit (swells first, then motions), but the swell side becomes a guided pick.
- `motion_swells.contribution_weight` UI default: new links default to 100. The split-percentage UI remains available on the motion detail sheet's swells chips, but is not surfaced until the user has at least one motion→swell link saved.
- No schema changes. No data migration. Existing swells with poetic names continue to work; the user can rename them at any time.

## Origin

Decision reached in a Cowork design session on 2026-05-17. Josh attempted to populate his own swells from a ten-item philosophical framework generated by ChatGPT, then a Cowork-proposed seven-swell consolidation. Both attempts felt too nebulous to organize daily actions against. He proposed restructuring around his existing Claude folders (Movement, Home, Food, Music, Travel, Family, Reflection, Creativity, Work, Passion) — concrete life areas — and observed that the resulting motions would naturally be verbs. The noun/verb framing emerged from that observation as the underlying pattern, and is the design north star for onboarding and swell vocabulary going forward.
