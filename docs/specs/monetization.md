# Monetization spec — Onduler

*Status: draft. Locked decisions below; everything else deferred until real users surface signal. Authored 2026-05-23, pre-launch (zero users).*

## Context

Onduler is in research-preview, free for all users. This doc captures the v1 monetization shape that ships when Stripe lands, and explicitly defers everything else until paying users tell us what else belongs in paid.

The brand stance: Onduler doesn't compete on coaching, streaks, or guilt. Anything sold must hold the "witness, not coach" working agreement from PROJECT.md. Paid features that drift toward coaching, behavioral nudges, or AI-generated insights violate the brand even at Crew pricing.

## V1 shape: a single tier — Crew

One tier only. Framed as "keep an independent app alive" with concrete additive value, not "unlock Premium features." The user-facing word is **Crew** — surf-voice, fits the secret-club launch frame, and doesn't make identity claims the way "Pro" or "Premium" do. CTA: *"Join the crew."*

### Anchor paid feature: LLM-assisted personalized setup

The thing that justifies the price on day one. Spec lives at `docs/specs/llm-assisted-import.md`. The user prompts their LLM with an Onduler-provided template, uploads the markdown output, and Onduler bulk-creates swells / motions / groups from it. Saves an hour of manual setup for the user who'd otherwise type everything in by hand.

This was the load-bearing signal in the decision: Josh confirmed he would have paid for this himself. That's the strongest pre-launch evidence we have that someone would open their wallet.

### Pricing

Final numbers TBD when Stripe ships. Working estimates:

- **Annual: ~$36/yr** ($3/mo equivalent). Workhorse tier — better LTV, less monthly churn, matches Onduler's long-rhythm posture.
- **Monthly: ~$5/mo**. On-ramp, priced so annual wins on math.
- **Lifetime: ~$99**, optionally capped at the first N founders. Converts the "secret club" launch frame into a tangible early-believer moment and gives a one-shot cash runway boost.
- **Open contribution** — one-time, minimum $25, Stripe preset $50. For friends, family, and supporters who want to give more than lifetime. Implemented via Stripe's `custom_unit_amount` on a fourth Price under the same Crew product; the `/support` page offers suggested chips ($50 / $150 / $500 / custom) in its own UI. Tucked **below** the three primary tiers as a quiet "want to give more?" option, never the lead. **Avoid the word "donation"** in user-facing copy — Onduler isn't a 501(c)(3) and contributions aren't tax-deductible. Cleaner framings: "Crew at any level" / "Pay what feels right" / "Back the project."

### Free tier stays complete

Free users keep: the full daily ritual (motions, swells, logging), all four cadence ceremonies (week / month / quarter / year), the Anchors journal, archive-and-fresh-start, JSON export, the current three themes. Crew *adds*, never subtracts from what was previously free.

### No ads (current default)

Onduler doesn't serve ads in v1 — no banners, no network ads, no sponsored content, no "pay to remove ads." This is the brand-led default. It is not a constitutional rule. If subscription revenue doesn't sustain the project, ads get reconsidered with brand tests as the design constraint: direct/curated only (not network), confined to surfaces that don't carry the contemplative core (not Wake / Anchors / ceremony), dismissible, and brand-tested before shipping.

## Candidates pending user signal

File-here-don't-build-yet ideas. Each gets considered for Crew — or for a second tier, if requests cluster — once real user demand surfaces.

- **Additional themes** beyond the current three (Default / Bolinas / Biarritz). Design work compounds; Crew-only themes are a clean visual flex.
- **Crew visual marks** on shared artifacts (wake postcards, Instagram-shareable images). Identity-as-upgrade-hook — the secret-club mechanic running on belonging rather than friction.
- **AI-witness ceremony deepening** — one optional reflective question (MI-rooted, never prescriptive) generated from the user's cycle data after expectation + observation. Bounded scope: single round-trip, one question per cycle, Claude Haiku for cost (~$0.005/interaction). Detailed treatment when this becomes a real session.
- **Past-chapter export formats** beyond JSON (CSV, PDF summaries, etc).
- **App integrations** — auto-log from meditation / cooking / exercise apps. Spec deferred to `docs/specs/app-integrations.md`.
- **Multi-tier laddering**. Don't pre-design. When real user requests organize themselves into two distinct value clusters, draw the line.

## Constraints any future paid feature must pass

- **Witness, not coach.** PROJECT.md working agreement. Paid features cannot drift toward telling users what to do, generating behavioral insights, scoring users, or making personality claims. Applies independently of pricing.
- **Skip is always a door.** Every prompt remains skippable end-to-end. Pay does not buy mandatory steps.
- **Free tier stays complete on the core ritual.** Daily motions, weekly ceremony, and the four-cadence Anchors surface never move behind paid. Crew adds enrichments around the core; it does not gate the core itself.

## Not on the table

- **Streak-recovery / pay-to-save-progress.** The exact pattern Onduler defines itself against. Cannot ship at any price.
- **AI coaching** (as distinct from AI witness). AI features must pass the witness test; coaching variants are out regardless of revenue potential.
- **Feature gates on the daily checklist, weekly ceremony, or any of the four cadence ceremonies.** These are the emotional core. Gating them is brand suicide.
- **Locked Anchors page as a paywall.** ADR 0007 established this as anticipation, not conversion. Stays that way.

## Open questions for Josh

- Final tier pricing.
- Lifetime tier cap — yes/no, what number (e.g., first 100 founders).
- Ship timing — alongside v1 exit criteria, or earlier as a way to test the Crew pitch before broader launch.

## Related

- `docs/specs/llm-assisted-import.md` — the anchor paid feature.
- `docs/launch-plan.md` — Phase 2 trigger list (Stripe shipping is a gate to broader launch).
- PROJECT.md working agreement: *"Onduler's voice is witness, not coach... features behind future paywalls must still pass this test."*
- `docs/decisions/0011-build-deflation.md` — naming posture (utilities, not identities). Same principle applies to tier naming.
