# Claude Design — Onduler design system setup prompt

Paste the block below into Claude Design's **"Set up design system"** flow. Revise freely before submitting — this is the v1 prompt and is expected to iterate.

---

## The prompt

Build a design system for **Onduler** (*on-doo-LAY* — French for *to wave*), a gamified personal-fulfillment app that helps people invest energy across the parts of their life that matter to them. Onduler is built on a single posture: **celebrate the user showing up — for themselves, for their life — and never make them feel watched, judged, or behind.** Every visual decision gets measured against that bar. The competition optimizes retention through guilt; Onduler optimizes retention through joy.

The core metaphor is the ocean. There are two modes a person can be in, and the app meets them where they are:

- **Tide** is the steady, default rhythm — the user is showing up regularly and the app gently helps them direct energy across life areas.
- **Wave** is a period of disruption, recovery, focus, grief, illness, or any other force that pulls them under. The app does not chase, does not punish, does not add red badges. When the user surfaces, the tide is gentle: *"hey, want to try this today?"*

### Locked vocabulary (use these exact words; never deviate)

- **Tide** — the default daily mode
- **Wave** — periods of disruption or recovery
- **Swell** — a noun-shaped area of life the user wants to invest in (Movement, Mind, Food, Home, Family, Friends, Work, Money, Creativity, Adventure). Each Swell has a weekly target; celebration fires when the user crosses it.
- **Motion** — a trackable daily action (verb-shaped: walk, cook, journal, kayak). Motions feed Swells.
- **Waypoint** — a user-authored marker within a Swell — a point they're navigating toward inside the Swell's ongoing rhythm.
- **Group** — an organizational folder for Motions and Swells. No target, no scoring.

**Never use these words anywhere in UI copy: tasks, activities, goals, domains.** They are on a permanent banned list.

The mental model to teach: **Swells are nouns. Motions are verbs.** A Swell is a part of life (Movement); a Motion is something you do (run). Many Motions feed many Swells.

### Aesthetic direction

Surf-inspired but adult and serious. Not beach-resort tropical; think the calm of a deep, cool, well-lit ocean at first light. The visual should feel like:

- **Deep water at rest** as the dominant surface — generous breathing room, soft blues, the sense of looking down through clear water at sand and stone
- **Foam, light, and crest** as the accent — white-on-blue moments that mark celebration without shouting
- **Sand and stone** as the warm neutrals — grounding, tactile, never sterile gray
- **Paper-list aesthetic on the daily surface** — when the user is checking off Motions, the list should read like something handwritten on a clean sheet of paper. Minimal chrome, no shadowed cards, no badge soup. List rows do not escalate to card containers just because they're tappable.

The voice in copy is warm, direct, brief. It speaks like a calm friend at the water's edge, not a coach with a whistle. Empty states use the **mirror principle** — they reflect what the user has done rather than nagging about what they haven't.

### Color system — three themes, ten swell colors each

Onduler ships multiple themes; users pick one and the entire palette flows from it. Build three:

1. **Default** — the canonical deep-ocean palette. Background reads as luminous off-white in light mode, deep slate-blue in dark mode. Primary accent is a cresting-wave blue. Text reads with high contrast. This is the everyday tide.
2. **Bolinas** — Northern California ocean. Cooler, foggier, more eucalyptus-and-stone. Pacific overcast morning energy. Slightly muted. Greens permitted; saturation lower than Default.
3. **Biarritz** — Atlantic surf town in southwest France. Warmer Atlantic light, sun-bleached pastels, a touch of terracotta and ocher in the neutrals. Brighter than Bolinas, softer than Default.

For each theme deliver:

- Light mode AND dark mode tokens
- A semantic token set: `bg`, `surface`, `text`, `text-muted`, `text-secondary`, `border`, `accent`, `accent-text`, `success`, `wave-wash` (a low-contrast translucent overlay used to soften the entire Reflections radar when the user is on or returning from a Wave)
- A **10-color Swell palette** — ten distinct, harmonious accent colors used to color individual Swells (one per Swell, randomly assigned at onboarding). They must read as a family in both light and dark mode, distinguishable when sitting side-by-side in a radar polygon or constellation.
- A guarantee that toggle-active controls use `bg-text` + `text-bg` (inverted from the surface) so the inversion works in both light and dark themes.

### Type system

A pair of typefaces:

- **Display / numerals** — a contemporary humanist serif or a confident slab. Used for Swell names in proficiency headers, large numeric celebrations, ceremony prompts. Should feel like a thoughtful book, not a fitness app.
- **Body / UI** — a clean, slightly warm sans-serif. Used everywhere else. Should be highly legible at 14–17px and feel calm at 24–32px.

Numerals are tabular. Whitespace is generous. No all-caps tracking-heavy buttons.

### Component primitives needed

Render each in light and dark mode, in at least the Default theme, and show the empty / populated / wave-mode variants where applicable.

- **Motion row (paper-list)** — name, points or hours value, check state. Tappable to log. Long-press to drag-reorder. No card chrome, no badges by default.
- **Daily progress bar** — slim, soft, sits at the top of the Motions surface.
- **Swell card / row** — name, color dot, weekly tide bar (progress toward target), small lifetime stat line.
- **Tide bar** — the weekly progress bar primitive used on Swell rows and at the top of the per-Swell proficiency view. 3px tall, low-saturation track, fills with the Swell's color. Crossing 100% triggers the celebration moment.
- **Constellation** — a per-Swell layout: a central node showing weekly value / target, with surrounding Motion nodes sized by points earned, opacity by recency. Quiet, planetarium-like. Used on the per-Swell proficiency view.
- **Radar (Reflections)** — an N-gon of pie-slice wedges, one per Swell, each in its Swell color at low opacity, with a filled "slice" inside scaling radially to this week's actual value. Reads like a series of fuel gauges arranged in a flower. Wedge target vertices are drag-handleable.
- **Bottom nav** — four tabs: Motions (a checkbox icon), Swells (a swell or layered-wave icon), Reflections (a mirror-shape icon), Settings. Active tab is high-contrast; inactive tabs are quiet. When a cycle-close ceremony is pending, the Reflections icon tide-pulses and the other tabs slightly dim. Every tap responds visually at 0ms (a small scale-down or color shift) — latency must never read as broken.
- **Celebration moment** — the animation that fires when a Motion log crosses a Swell's weekly target. Think a single wave swelling and breaking outward from the Swell, brief bloom of foam, then settle. Two to three seconds maximum. Triggers on the Sunday window as a designed counterweight to Sunday-evening dread.
- **Wave-mode wash** — a soft full-screen overlay applied to the Reflections radar when the current week intersects a Wave. Subtractive, calming, never alarming. Accompanied by a small "ramp" pill (40% → 70% → 100% over 3 weeks of return) that softens targets without erasing them.
- **Locked Reflections page** — the visual shown when a cadence has not yet unlocked. **Pure vibe, no data.** A blurred hexagonal silhouette where the radar will eventually be, slow-drifting horizontal tide lines, soft welcoming copy with no date and no engagement counter. Glimpses without numbers. Mystery, not gating.
- **Cycle-close ceremony layout** — a three-step modal flow: *"What did you expect to see this week?"* → frozen radar reveal of last week → *"What did you see?"* → CTAs (Swells / Motions / Skip). Both text prompts skippable. Skip is always a visible, gentle option — never hidden, never penalized.
- **Skip affordance** — a small consistent treatment for the skip control across every prompt and ceremony. **Skip is always a door.**
- **"Add" entry pattern** — when the user taps "+" to create a Motion, Swell, or Group, the keyboard immediately fills the bottom half of the screen with a compact form sitting just above it. No bottom sheet, no modal chrome. The keyboard *is* the experience.

### Motion / animation moments

Onduler is a calm app punctuated by small celebrations. The motion language is **water-aware** — fills rise, wedges fill radially, celebrations swell and break. No bouncy spring physics, no confetti-cannon energy. Specific moments the system should specify:

- Tide bar fill (smooth, water-rising)
- Celebration wave/bloom on target crossover (one wave, one break, settle)
- Tide-pulse on the Reflections nav icon when a ceremony is pending
- Drifting tide lines on the Locked page (slow, horizontal, looping)
- Wave-mode wash fade-in
- Press feedback on every navigation tap (instant scale-down)

### Anti-patterns — visible failure states

These break the design and should be flagged explicitly in the system documentation as things to never do:

- Red numbers, red badges, red counters for "missed" anything
- Streak counters that reset visibly to zero
- "You haven't done X in N days" copy
- Dense card stacks with shadows on the daily Motions list
- RPG-flavored vocabulary leaking into UI copy (the skill-tree / build framing is an internal design heuristic only — the surface stays in surf voice: Tide, Wave, Swell, Motion, Waypoint)
- The words **tasks, activities, goals, domains** anywhere a user can see them
- Forced text fields, required answers, or non-skippable prompts in any ceremony or guided flow

---

### Deliverable

Generate a complete design system covering the three themes, the type pair, every component primitive listed above, the motion specs, and the anti-patterns. Treat this system as the source of truth that future Onduler screen prototypes will be built against.

---

## Notes for Josh

- This is a v1 prompt. Expect to iterate — after the first generation, look at what Claude Design produced, identify what feels off, and refine the prompt rather than fixing the output piecewise. The prompt is the spec.
- After the design system stabilizes, the next prompts will be individual screen prototypes against it: Motions (daily), per-Swell proficiency view, Reflections radar, celebration moment, Locked Reflections page, cycle-close ceremony flow.
- When the design system is in a place you like, save the resulting tokens, type choices, and component specs back into `docs/design/aesthetic.md` as the canonical written reference, alongside whatever artifact URL or export Claude Design gives you.
