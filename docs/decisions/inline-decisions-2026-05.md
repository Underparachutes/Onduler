# Inline decision write-ups (May 2026) — archived from PROJECT.md 2026-07-03

These are the original decision write-ups that lived inline in PROJECT.md's "Decisions" section, preserved verbatim. Most are superseded by numbered ADRs in this folder; two ("Groups vs Swells" and "Swells repeat weekly, Sunday-anchored") exist only here.

---
### Groups vs Swells (May 2026)

Groups and Swells solve non-overlapping problems and should not be collapsed into one concept.

- **Groups** are organizational containers. One motion belongs to one group (or none); one swell belongs to one group (or none). Pure UX utility — they help the user mentally cluster and filter their lists. They answer the question *where does this live in my list?*
- **Swells** are aspirational goals. A motion can contribute to many swells; a swell is fed by many motions. Each motion→swell link carries its own `contribution_weight`, enabling the additive points model (e.g., meditation can contribute 100% to "be healthy" and 40% to "be a better partner" simultaneously). They answer the question *why does this matter?*

Locked schema target:

```
groups        (id, user_id, name, sort_order)
motions       (id, user_id, group_id NULLABLE, name, base_points, ...)
swells        (id, user_id, group_id NULLABLE, name, target, ...)
motion_swells (motion_id, swell_id, contribution_weight)
```

`group_id` on motions is nullable — ungrouped motions are fine, especially early on when a user is still figuring out their categories.

**Why this matters.** Most habit apps either have flat lists (no organization) or single-goal tagging (no additive credit). Collapsing Groups and Swells would either lose the additive points benefit (if everything became 1:many) or make the motion list unscannable (if everything became many:many). The two-concept model is Onduler's distinctive structural choice — don't propose simplifying it away.

**Implementation gap (as of May 2026).** Schema now matches the locked target: `motions.group_id` FK is live, and `motion_swells.contribution_weight` is active in all aggregation paths (swells page, log page, swell progress bars). The old `motion_groups` junction is gone.

### Groups on swells (May 2026)

Groups now apply to swells the same way they apply to motions. Each swell belongs to one group (or none); the `groups` table is shared across motions and swells. A single "Health" group can have both motions and swells pointing at it.

**Why.** Same folder logic as motions — "where does this live in my list?" — applied to swells. Two user modes drop out of the same shape:

- The user who wants **mirrored organization** between motions and swells uses the same groups on both sides. Filtering by a group on the motions page and navigating to swells keeps the filter, and the corresponding swells appear. Feels consistent.
- The user who wants **independent organization** assigns groups to motions and swells separately, with little or no overlap. Filtering on one side surfaces nothing on the other, which correctly reflects that the group isn't used there. Feels independent.

The misalignment diagnostic (does my daily motion clustering match my long-term swell clustering?) remains visible at the group level without requiring M:N or separate group tables.

**Locked schema for the extension:**

```
swells (id, user_id, ..., group_id NULLABLE FK → groups, ...)
```

No `swell_groups` table. No `motion_groups` junction (already removed). Single shared `groups` table.

**Shipped (May 2026).** `swells.group_id` FK is live. UI wired: group assignment on swell detail, grouped display on swells page, group filter. ADR: `docs/decisions/0001-groups-schema.md`.

### Swells repeat weekly, Sunday-anchored (May 2026)

All swells run on a single weekly cycle anchored to Sunday. The old "set a lifetime target, fire one celebration, done" mode is removed. A swell's target is now a weekly target; celebration fires when cumulative weekly progress crosses it; the cycle runs Sunday 12:00 AM → Saturday 11:59 PM Pacific (Sun→Sat), and the counter starts at zero again on Sunday morning.

**Why.** Swells are not destinations. They are philosophies the user wants their life to feel full of — creativity, beauty, connection, freedom, good food — which require steady weekly feeding, not one-time completion. The one-shot-celebration framing implied that life-want goals get *finished*, which is the wrong frame and the wrong product. A weekly cycle matches how lives are already structured (work week / weekend), gives the diagnostic "which want am I feeding most?" a stable reference window, and pairs philosophically with the wave/tide vocabulary — Onduler is about rhythms.

**Sunday anchor.** The week starts Sunday morning — ceremonies unlock then if they qualify, and the new cycle is ready the moment the user opens the app on Sunday. Most users won't notice until sometime during Sunday; the app doesn't push a notification, it waits for the user to come when they're ready to be reflective. A missed week is not punishment; it's a wave, and the app's posture stays "we'll be here when you're back."

**Motions can stay unassigned.** A motion does not have to feed a swell. The gap — motions you do daily that don't feed any stated want — is itself a useful diagnostic surface: the user either adds a swell to cover it, or asks whether the motion belongs in their daily life at all. Future feature, not in scope for the weekly-model session.

**Onboarding implication.** Swell-first, then motions per swell. The swell step is a noun-shaped menu of common life areas with custom add, replacing the current quick-start / build-your-own flow. Listing swells is required to engage with the app. The noun/verb framing surfaces explicitly in onboarding copy: "Swells are nouns. Motions are verbs." See ADR 0002. The onboarding rework is its own session after the weekly-model session lands.

**Canonical swell menu (10).** The seeded menu in onboarding is:

| Swell | Description |
|---|---|
| Movement | exercise, sport, walking, being in your body |
| Mind | meditation, journaling, reading, learning |
| Nutrition | cooking, eating well, nourishment |
| Home | your space, comfort, domestic life |
| Family | partner, kids, parents, siblings |
| Friends | broader social life, community |
| Work | your livelihood, career, craft as profession |
| Money | finances, savings, side income |
| Creativity | making things, art, music, writing |
| Adventure | travel, novelty, trying new things |

The user can rename, recolor, deselect, or add custom swells. Descriptions are shown as sub-text under the swell name in the menu and disappear once the swell is picked.

**Schema impact.** `swells.target_points` and `swells.target_hours` now mean "per week." No `repeats` flag — one mode only. Cycle state is derived from `logs.logged_at` and the Sun→Sat week definition, not stored on the swell. Lifetime totals can still be shown as a stat but do not drive celebration.

**Locked defaults.** ~~100 pts/week or 5 hrs/week~~ Superseded 2026-06-12 by motion-derived targets: where a swell's feeding motions are known at creation (onboarding, AI import), target = 4 logs/wk of each feeding motion in points mode (`ceil(4 × Σ pts×weight)`), 3 logs/wk in hours mode (0.25-hr ceil). The floor (a motionless or bare swell) is 4 pts / 3 hrs, matching what one default motion yields — corrected 2026-06-12 from 12 pts, which had a swell with no motions outranking a 1-motion swell (target 12 vs 4) on the radar for no visible reason; the hours floor was already consistent. Bare creation (manual createSwell, starter sets) shares the same 4 pts / 3 hrs floor. This resolves the ADR 0003 "defaults likely re-tune" note — the normalized contribution model plus the 1–3 pt scale made 100/wk unreachable (a 3-motion swell maxed ~42/wk), so celebrations never fired.

**Migration.** None required. Single-user (Josh), one week of data, no production users. Old swell targets get reinterpreted as weekly when the session ships.

### Swells are noun-shaped life areas, motions are verb-shaped actions (May 2026)

The mental model for users and copy is: **Swells are nouns. Motions are verbs.** A Swell is a noun-shaped area of life the user wants to invest in — Movement, Home, Food, Family, Creativity, Reflection, Work, Travel, and so on. A Motion is a verb-shaped daily action — kayak, cook, decorate, journal, make a playlist. The previous framing of Swells as "philosophies the user wants their life to feel full of" was poetically correct but freeze-inducing in practice; the noun/verb pattern unsticks users in one sentence.

**No schema change.** A Swell is still a row with a name and a weekly target. The reframing is in onboarding copy, default suggestions, and UI hints — not in the data model.

**Onboarding shift.** The swell step becomes a pick-then-add menu of common life areas with custom entry as a follow-up. The previously-planned open-ended "What do you want your life to feel like?" prompt is replaced. Motions are then added per swell.

**Contribution-weight default.** New motion→swell links default to `contribution_weight = 100`. The split-percentage affordance remains in the motion detail sheet but is not surfaced until the user has at least one link saved. In the noun-shape model, most users assign one swell per motion at full weight; weighted multi-swell contributions become an enrichment for users who want them, not a load-bearing requirement. The additive interpretation of `contribution_weight` (a motion's contributions across swells can exceed 100% total) is superseded by ADR 0003 — see the Normalized contribution model decision below.

**Vocabulary unchanged.** The user-facing word stays "Swell." "Domains" remains on the never-use list. The noun-shape framing is an internal teaching pattern, not a rename.

ADR: `docs/decisions/0002-swells-are-nouns.md`.

### Normalized contribution model (May 2026)

A motion's contributions across all the swells it feeds sum to ≤100% (not >100%, as the original additive model permitted). A motion is worth exactly its base value, distributed across its swells — never multiplied. Adding a second swell to a motion opens an allocation slider; editing one swell's allocation auto-rebalances the others on that same motion, proportionally, to keep the total constant. The motion detail sheet surfaces a "X% remaining" indicator.

**Why.** The additive model dispensed more credit than the action contained (a 3-pt meditation could contribute 100% to Mind and 40% to Family, totaling 4.2 pts of swell credit for one 3-pt action). The math was generous but conceptually fuzzy, making "where did my points go this week?" un-answerable and weekly targets squishy. The normalized model gives targets absolute meaning and aligns the math with how users actually describe their actions (a split, not a duplication). It also gives build-suggested motion splits (ADR 0004) stable meaning — "Yoga → 60% Movement, 40% Mind" composes predictably when shapes blend.

**Schema unchanged.** `motion_swells.contribution_weight` keeps its column shape and meaning. Constraint is app-enforced. One-time renormalization of existing rows on ship: any motion whose links sum to >100% gets its weights scaled to sum to 100%, preserving proportions. Acceptable because there's one user and one week of real data.

**Defaults likely re-tune.** Weekly target defaults (currently 100 pts/week or 5 hrs/week) probably want to drop after a few weeks of normalized data — less credit flows per motion, so targets become harder to hit at the current numbers. Deferred until there's data to look at.

ADR: `docs/decisions/0003-normalized-contribution-model.md`.

### Builds and the proficiency view (May 2026)

Onduler adopts an RPG-skill-tree-influenced model for orienting a user's week, internally called a **build** and user-facing as a **shape** (as in "a maker's rhythm," "your shape," "try a different shape"). Internal/external vocabulary split — RPG framing stays in design and code identifiers; surf voice stays at the surface. Builds are *suggestions, never prescriptions*: they curate the menu of what counts (suggested motions, suggested swells, suggested waypoint templates) but never weight some motions more than others.

**Four preset shapes** ship as placeholders: The Maker (Creativity, Work, Mind), The Athlete (Movement, Nutrition, Mind), The Wanderer (Adventure, Movement, Creativity), The Scholar (Mind, Work, Creativity). Caretaker is dropped pending naming pre-launch. Users always retain the "build your own shape" path.

**Onboarding stays as-is** — the existing light 2x2 pack picker is the right shape for an empty starting state. The richer build experience (gallery + diff/preview + per-change opt-out + secondary-shape slot + custom path) lives in **Settings**. Tapping a preset opens a preview showing exactly what would change (swells to add, swells to hide, targets to retune); each change is individually opt-out-able. Nothing is deleted on respec; swells are hidden at most. Logs and motions are sacred.

**Swells page rebuilds as per-swell proficiency views** — the visually heaviest move and the v1 deliverable. Each swell becomes a header (weekly tide bar + small lifetime stat, no tier badges) plus a constellation of motion nodes (size = contribution weight, opacity = recent activity, log count inside), arrangeable via drag, capped at 8 with a "+ N more" overflow to a flat list. List-view toggle in the top-right. Time-view toggle (Week / Month / Lifetime). Waypoints section below — recurring on top, one-shots below, sortable, completed collapse by default.

**Today page stays sacred.** Paper-list aesthetic, flat motion checklist, simple, customizable, welcoming. All structural complexity lives on Swells and Settings. Today is a daily ritual surface; Swells is a strategic surface; the two-surface split is how Onduler scales without becoming exhausting.

**Waypoints** (table stays `milestones`, see ADR 0006) are user-authored, two flavors: recurring (cadence-based, partial-ring visual, hitting cadence celebrates and adds bonus points) and one-shot (discrete goal, marked off manually, optionally shows a small progress crumb from a linked motion, becomes a permanent marker on the swell's proficiency view when completed). Builds may suggest waypoint templates; the user always writes the specifics.

**Wave / build interaction.** When the user is on or returning from a wave, the build is at rest, not erased. Logs-page lens defaults to a softened view (wave-aware targets, "hitting these still counts") with a Softened/Reference toggle. Welcome-back screen after WaveGrid check-in offers two doors — *Ease back in* (recommended, soft 3-week ramp 40% → 70% → full) and *Pick up your [shape]* (full targets) — plus a small "Try a different shape" link. Per-shape minimum-viable-shape anchors are auto-selected from the user's top 2 most-logged motions, with Settings affordance to drop, swap, or add.

**Schema additions:** `motion_swells.position_x/y` for arrangeable constellation layout; new `milestones` table (user-facing name: Waypoint — kind: recurring | one_shot, optional cadence / target_count / completed_at, bonus_points, sort_order); `user_settings.primary_build` and `user_settings.secondary_build`. Secondary slot ships as UI only in v1; multi-classing math lands with the Logs page redesign.

ADR: `docs/decisions/0004-builds-and-the-proficiency-view.md` (amended by ADR 0006 for user-facing waypoint rename).

### Calendar-month monthly cycle, wave month, and ceil display rule (May 2026)

The Log page and proficiency view gain a calendar-month view alongside the existing weekly view. Monthly cycle anchors to the calendar month (first-of-month reset), running independently alongside the Sunday-anchored weekly cycle. Monthly target is never stored — derived at render via `ceil(weekly × days_in_month / 7)`. Lifetime target similarly derives via `ceil(weekly × weeks_since_first_log)`.

**Wave month** triggers iff there's a run of 7+ consecutive zero-log days inside the calendar month. Less than 7 doesn't trigger the wash. The threshold has a designed side effect: a user who logs even once per Sunday-to-Saturday window never trips wave-month — that's the gentle weekly check-in nudge built into the math.

**Symmetric drag editability:** weekly target stays the integer source of truth (drives the celebration anchor). Drag on the monthly view edits the underlying weekly target with appropriate step scaling. Live pill on monthly view shows both values (`Mind · 222 pts/mo · 50 pts/wk`). Lifetime view is read-only — recognition surface, not tuning surface.

**Ceil everywhere a number reaches the screen** (see corresponding working agreement). Precision under the hood, integer display on top.

Filter labels rename: `7 days` → `This week`, `30 days` → `This month`. Schema unchanged.

ADR: `docs/decisions/0005-monthly-cycle-and-wave-month.md`.

### Waypoint (user-facing rename) and export labels (May 2026)

The user-authored marker-within-a-swell previously called "Milestone" is renamed **Waypoint** in all user-facing surfaces. The schema table remains `milestones` and all code identifiers stay — same internal/external split already used for `builds` → user-facing "shape." The rename is a UI-copy change, not a refactor; ADR 0004's schema, behavior, and design rationale are unchanged.

**Why waypoint.** "Milestone" was the one user-facing term that didn't live in the ocean — Tide/Wave/Swell/Motion are water, milestone is highway construction. Waypoint is nautical/navigational without being surf jargon (most users know it from GPS, hiking, boating), so it fits the metaphor family without expanding the niche-vocabulary load the way "buoy" or "marker buoy" would. Semantically it carries the journey-marker meaning the entity already has. The mild tension with the swells-aren't-destinations doctrine is resolved by reading waypoints as *intermediate markers within an ongoing rhythm*, not endpoints of it. The locked surf vocabulary expands from four terms (Tide/Wave/Swell/Motion) to five (adding Waypoint).

**Export labels.** Data exports (the existing `/api/export` JSON download and any future export surface) label data with the words the user sees in the UI — Waypoint, Swell, Motion, Group, Tide, Wave — not the internal table names. A `milestones` array in the export becomes `waypoints`. The export is a translation layer; the schema stays where it is. This is the export-side application of the internal/external vocabulary split already in use for build/shape and now milestone/waypoint.

ADR: `docs/decisions/0006-waypoints-and-export-labels.md`.

### Reflections surface, cycle-close ceremony, and bottom-nav rename (May 2026)

The Log page is renamed **Reflections** and repositioned from "diagnostics" to *the mirror where the user adjusts themselves* — the strategic reflection surface where change happens. The Today page is renamed **Motions** (with a checkbox icon in the bottom nav). The four bottom-nav surfaces become noun-shaped and role-clear: **Motions (ritual) / Swells (strategy) / Reflections (reflection — change) / Settings (configuration).**

**Cycle-close ceremony.** A new ceremony lives on Reflections, fired by the bottom-nav tab itself when a cycle closes (other tabs dim, Reflections animates with tide-line motion). One shape across four cadences (weekly / monthly / quarterly / yearly): *"What did you expect to see this [cycle]?"* → closed-cycle radar reveal → *"What did you see?"* → *"Want to tune something?"* with Swells / Motions / Skip. Both text prompts optional and individually skippable. The MI work happens in the gap between expectation and observation; the radar is the third-party witness that holds the data so Onduler doesn't have to. Cadence is the depth knob — same two prompts at every cadence, no per-cadence question banks.

**First-time-only locks.** Each cadence is locked until the user has lived through one full calendar instance of it AND met an engagement floor: 3 / 8 / 25 / 80 days logged for weekly / monthly / quarterly / yearly. Once unlocked, stays unlocked for the chapter. Calendar-anchored ("we're all in time together") rather than user-anchored — every Onduler user crosses the same Sunday, the same Dec 31. Locked page is **vibe-only**: blurred radar silhouette, moving tide lines, glimpses without numbers, soft copy with no date and no engagement counter. Pure mystery; marketing site explains the pattern for users who want the mechanism.

**Wave-cycle handling.** No ceremony, no indicator if the user logged zero motions across the cycle. Soft "we'll be here when you're back on the board" copy somewhere quiet. Indicator expires on next cycle rollover — no stacking, no guilt.

**Persistent reflections journal.** Sub-surface at `/reflections/journal` — a contemplative library of every reflection across all chapters, in chronological order with chapter separators. Each ceremony entry saves the closed radar + expectation + observation + did_tune flag. `+` in the top-right of `/reflections` opens a blank free-form journal entry (default-anchored to currently-viewed cycle, editable), with optional themed prompts from a bank (the recycled MI question library, organized by theme rather than cadence).

**Archive-and-fresh-start.** Available only at the end of a cycle-close ceremony — reward reflection with a clean slate. Confirming moves the current chapter into the user's chapter library (Settings → Past chapters, browseable read-only) and starts a new chapter that re-onboards from scratch: new build pick, new swells, new motions, locked Reflections page that re-earns its unlocks. Past chapter reflections live in the journal alongside their chapter separator, but don't follow the user into the active surface of the new chapter — reset like a new user means truly reset.

**After year one.** Once all four cadences have unlocked, expose a Settings option for the user to choose how often Onduler invites them to reflect — some want weekly nudges, some want yearly only. Requires a notification system that doesn't exist yet — deferred dependency, not blocking the surface itself.

**Quarterly is a new cadence.** Calendar quarter (Q1 = Jan–Mar etc.). Quarterly target = `ceil(weekly × days_in_quarter / 7)`, same ceil-display rule.

**Schema additions.** `chapters` (first-class, one active per user) and `reflections` (chapter-scoped, both ceremony and free-form entries). Schema-scoping of existing tables to chapters is an implementation choice deferred to the implementation session — behavior requirements are: archived data is preserved and read-only browseable from Settings; the active app only sees current-chapter data; new chapter starts fully clean.

ADR: `docs/decisions/0007-reflections-surface.md` (amended by ADR 0008 for the surface rename).

### Reflections renamed to Anchors (May 2026)

Three days after ADR 0007 shipped the Reflections surface, testing-session feedback surfaced a stronger surface name: **Anchors**. The cycle-close-and-notice surface formerly named Reflections is renamed to **Anchors** — both the surface itself and the entry-level word (an "anchor" is what the cycle-close ceremony writes; `+` "drops an anchor" as a free-form entry; the journal sub-route is "your anchors"). The framing comes from Josh's testing notes: *"Your swells anchor you to who you are as a person. If you drift away from them with your motions you become out of sync."*

The bottom-nav surfaces become: **Motions / Swells / Anchors / Settings.** The anchor icon already in place on the Reflections tab carries forward unchanged. The user-facing surf vocabulary expands from five terms (Tide / Wave / Swell / Motion / Waypoint) to six with Anchor added — Anchor sits cleanly inside the water-family vocabulary without expanding the niche-lingo load.

**Internal/external split preserved.** Schema table `reflections` does **not** rename — same pattern already in use for `milestones`/Waypoint and `builds`/shape. Code identifiers (`app/actions/reflections.ts`, `getWeekCeremonyState`, etc.) stay put. The route `/reflections` and directory `app/reflections/` move to `/anchors` and `app/anchors/` to match the user-facing surface — internal-vs-surface boundary is the table layer, not the routing layer.

**One column rename.** `user_settings.mvs_anchors` (the JSON store for per-shape "still showing up" motions on welcome-back from a wave) renames to **`user_settings.mvs_motions`** so the word "anchor" belongs to the surface. The Settings → Your shape page section currently labeled "Anchors editor" renames to avoid the collision (final wording TBD in implementation — likely "Still-showing-up motions").

**Two small accompaniments ship with the rename.** A quiet tertiary line on the locked Anchors page: *"Every motion leaves a wake."* And a contrast/density tuning pass on the hex `slow-breathe 4s` keyframe in `LockedPage.tsx`, which is currently imperceptible on iOS — final values tuned live during the implementation session.

**Why now.** Surface names are corrigible until users see them; Onduler has exactly one user, and that user has now used the surface and surfaced a better name. Catching the rename before any meaningful adoption is the right move. Doing it at the ADR level now (decision locked) and leaving the implementation queued (code unshipped) means the next Claude Code session has full spec and zero re-litigation when Josh is ready.

ADR: `docs/decisions/0008-reflections-renamed-to-anchors.md`.

### Wake — the actuals-only visual primitive (May 2026)

A new visual primitive, the **wake**, replaces the generic breathing hex on the locked Anchors page across all four cadences (week / month / quarter / year). The wake is the user's actuals shoulder polygon, drawn over a cycle window, stripped of wedge backdrop and target handles, rendered monochrome, with N vertices where N equals the user's swell count. Live data, every cadence, from day one — no random placeholder. A brand-new user with zero logs sees a pulsing circle; as they log, the wake coalesces from circle to N-gon, every motion pushing its swell axis outward.

**Wave-mode behavior.** The wake hides entirely (replaced by the `WaveField` ocean canvas) but reappears the moment the user logs a motion during the wave, starting from a fresh circle. Welcome-back from a wave resets to a fresh pulsing circle paired with the "every motion has an impact" copy line. The wake answers presence, not absence.

**Vocabulary expansion.** The locked surf vocabulary grows from six terms to seven with **Wake** added (Tide / Wave / Swell / Motion / Waypoint / Anchor / Wake). Sits cleanly in the water-family without surf-jargon overhead.

**Marketing reuse.** A `generateRandomWake(seed, n)` helper in `lib/wakes.ts` produces seeded random wakes for postcards, landing-page hero, and Instagram posts. Same shoulder-polygon math, fed synthetic actuals. The in-product wake is always live; the marketing wake is always seeded.

**Copy primitives.** Primary tagline: *Every motion leaves a wake.* (postcards, landing-page hero). Visual-paired caption: *Show me your wake.* (used only when the visual is right there to give context — Instagram, hero pair). Welcome-back line: *Every motion has an impact.* (in-product, paired with the fresh circle). Rejected: *What's in your wake?* — identical cadence to "What's in your wallet?" (Capital One), subconscious rhythm match undercuts the secret-club aesthetic.

No schema change; wakes are derived from existing `logs` and `motion_swells` data.

ADR: `docs/decisions/0010-wake.md`.

### Build deflation — drop "shape," Settings becomes "Starter sets" (May 2026)

ADR 0004's user-facing word **shape** is dropped. The Settings tile renames from "Your shape" to **Starter sets**. The four presets (Maker / Athlete / Wanderer / Scholar) survive as named starter sets — utilities, not identities. The secondary slot drops from UI for now (the `secondary_build` column stays in schema for possible re-introduction).

**Why.** "Your shape" implied identity ("I am a Maker"); the mechanism is closer to "we curated some swells for you." That gap between word and mechanism made the surface feel like productivity-app rhetoric. Deflating the word collapses the gap. Onduler's celebration-over-judgment posture leans away from identity claims — habit apps that frame users as types slip easily into telling users who they are, the prescription failure mode ADR 0004 explicitly warns against.

**Internal/external split preserved.** Code identifiers stay: `user_settings.primary_build`, `user_settings.secondary_build`, `lib/builds.ts`, `BUILD_PRESETS`. The internal RPG-skill-tree design heuristic stays as PROJECT.md guidance. Only the user-facing surface deflates.

**Welcome-back copy** (ADR 0004 §8). "Pick up your [shape]" → "Pick up where you left off." "Try a different shape →" → "Try a different starter set →." The `welcome_back_mode` column and ramp behavior are unchanged. ADR 0010 (the wake) replaces the welcome-back card's visual with a fresh pulsing circle.

**Removed.** The "Part of your maker's rhythm" build-context footer on the per-swell proficiency view — line was always quiet and now reads as overclaim.

No schema change.

ADR: `docs/decisions/0011-build-deflation.md`.

