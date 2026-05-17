# Onduler — State of the Project

*Last updated: May 2026*

## The big picture

**Onduler** is a gamified personal fulfillment app built around points-based habit tracking across life domains. The goal is to bring balance to life by helping you track where you spend your energy. Domain owned: **onduler.app**.

## The core product insight: waves and tides

Most habit apps treat every day like it should look the same. Onduler doesn't. The app recognizes two modes a person can be in, and meets them where they are. Every interaction with Onduler should feel like a celebration of the user showing up — for themselves, for their domains, for their life. This is the bar every design decision gets measured against. If a feature makes the user feel watched, judged, or behind, it doesn't ship, even if it would drive engagement metrics. The competition optimizes for retention through guilt; Onduler optimizes for retention through joy.

- **Waves** = Human energy and capacity cycle. Sometimes a wave is a creative obsession. Sometimes it's a depressive episode that keeps you in bed for a week. Sometimes it's grief, illness, a new baby, a hard season at work. Onduler treats them the same: a wave is whatever's pulling you under right now, and the app's response is to not chase you. We'll be here. Take care of what you need to take care of. When you surface, the tide is gentle — "hey, want to try knitting today?" — and the app meets you wherever you've landed. The product never uses the language of failure, deficit, or falling behind. Showing up at all is honored.

- **Tides** = the steady, default rhythm. When you're not on a wave, the app gently helps you direct your energy across domains so nothing atrophies. This is where the gamification lives — points, hours, swells.

## Vocabulary (user-facing — never deviate)

| Term | Meaning |
|---|---|
| **Motion** | A trackable daily activity (the code table is also `motions`) |
| **Swell** | A noun-shaped area of life the user wants to invest in (e.g. Movement, Home, Food, Family, Creativity, Reflection). Has a weekly points target or weekly hours target. Celebration fires each time cumulative weekly progress crosses the target; the cycle resets at end-of-Sunday. Motions can belong to many swells. **Mental model: swells are nouns, motions are verbs.** See ADR 0002. |
| **Group** | An organizational bucket for motions and swells. No target, no scoring. Each motion and each swell belongs to one group (or none). |
| **Tide** | Default daily mode |
| **Wave** | Period of focus, recovery, or disruption — app does not punish this |

**Never use:** tasks, activities, goals, domains

## Tech stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database / Auth | Supabase (Postgres + Auth) |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Payments (future) | Stripe |
| Source control | GitHub (`underparachutes`) |

## Data model

| Table | Key columns | Notes |
|---|---|---|
| `motions` | id, user_id, name, default_points, default_hours (default 1.0), group_id (nullable), parent_id (submotions), hidden, sort_order | parent_id enables submotions; hidden removes from daily checklist; group_id is the (single, optional) organizing folder |
| `swells` | id, user_id, name, color, target_points (nullable), target_hours (nullable), group_id (nullable), color_picked_in, sort_order | Either/both targets optional; group_id is the (single, optional) organizing folder |
| `groups` | id, user_id, name, color, color_picked_in, sort_order | Organizational only, no targets; shared across motions and swells |
| `motion_swells` | motion_id, swell_id, contribution_weight | Junction: many-to-many, weighted |
| `logs` | id, user_id, motion_id, points, hours, logged_at | hours defaults to motion's default_hours at log time |
| `wave_checkins` | id, user_id, energy, alignment, duration_seconds, checked_in_at | |
| `user_settings` | user_id, groups_enabled, daily_goal, daily_goal_hours, tracking_mode, theme, celebration_enabled, haptic_enabled, onboarding_complete | |

## Current state of the build

**As of this session (May 2026), the following is working:**

- Auth (login / signup / sign out) — verified working on mobile (iOS)
- Onboarding flow (noun-shaped swell menu → per-swell motions → personalize) — verified working on web. 10 seeded swells (Movement, Mind, Food, Home, Family, Friends, Work, Money, Creativity, Adventure) with descriptions; pick-then-add menu; per-swell motion sections with verb hints; theme + tracking mode + haptics + celebrations on the personalize screen with skip-to-defaults
- Dashboard: daily checklist with flat mode and groups mode, hide-done toggle, daily progress bar, wave detection
- Motions: create, edit (name/pts/hrs), delete, log, unlog, drag-to-reorder, hide/unhide
- Dashboard interaction model: tap card to log, long-press to drag-reorder, kebab opens detail sheet
- Motion detail sheet: edit name/pts/hrs, two-tap delete, swells chip assignment with contribution weights, groups chip assignment, submotions, unlog, hide toggle
- Submotions: create (via detail sheet), log/unlog independently; shown only in detail sheet (not checklist); budget auto-divides parent's pts/hrs equally across submotions on add/remove/parent edit *(decision May 2026: feature will be hidden behind a `SUBMOTIONS_ENABLED` constant — schema and code stay intact, UI surfaces gated; turn back on later if needed without rework)*
- Search: filter motions by name in flat mode checklist
- Groups: create, edit, delete, reorder (drag), enable/disable via settings toggle
- Swells: create, edit (name/color/weekly target), delete, assign motions via toggle chips with per-swell contribution weight (1–100%), weekly progress bars with weighted aggregation, "last week" reference stat, checkmark on target hit, hide-done uses weekly completion
- Celebration trigger: wave/bloom animation fires the moment a motion log crosses a swell's weekly target
- Many-to-many: motions ↔ swells (with contribution_weight), motions ↔ groups
- Log (reports) page: period filter, stats, swells breakdown, daily chart, activity feed, waves
- Settings: theme picker, groups toggle, daily goal, celebration/haptic toggles
- Wave mode: 72hr auto-detection, manual wave return with WaveGrid check-in
- Data export: JSON download of all user data
- PWA: manifest, icons
- Themes: Default, Bolinas, Biarritz
- Bottom nav: Today / Swells / Log / Settings, persistent across app pages
- Parallelized SSR data fetching: dashboard, log, and settings pages collapsed from 6–9 sequential DB round trips to 2–4 via `Promise.all`. Wave detection extracted into a helper so its two-query subchain runs in parallel with the rest of the dashboard load
- "Motions not feeding any swell" diagnostic surface on the swells page: quiet section labeled "Not feeding any swell" with subhead "Adopt them into one, or let them go." Each row offers inline Add to a swell (opens detail sheet) and Hide (optimistic). Section hides entirely when there are no orphan motions
- Group-centric assignment: tapping a group in Settings shows two tappable lists (Motions, Swells) under the name/color form. Items already in another group show "in [other]" and reassign on tap. Optimistic updates via existing `setMotionGroup` / `setSwellGroup`
- Onboarding archetype starter packs: 2×2 grid above the swell list (The Maker / The Caretaker / The Athlete / The Wanderer). Tap a pack to pre-pick its three swells; tap the active pack again to clear. Picked swells sort to the top of the list so selections cluster together. Active pack highlight clears when user modifies picks. Each theme palette bumped to 10 colors; onboarding seeds the 10 swells from a shuffled palette so each gets a distinct color

**Deferred / not yet built:**
- Bolinas theme (visual design system not implemented — current "Bolinas" is a palette swap on a placeholder)
- Stripe / monetization

## Roadmap (next sessions)

| Session | Goal |
|---|---|
| **Next** | Bolinas theme design system — current Bolinas is a palette swap on the default visual layout; build the full visual design system (typography, surface treatment, accents, motion) so the theme feels distinct from Default |
| **After** | Stripe, premium gating, additional themes |
| **After** | LLM-assisted import — user prompts their LLM with an Onduler-provided template, uploads the markdown output, Onduler bulk-creates swells/motions/groups |

## Decisions

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

All swells run on a single weekly cycle anchored to Sunday. The old "set a lifetime target, fire one celebration, done" mode is removed. A swell's target is now a weekly target; celebration fires when cumulative weekly progress crosses it; the cycle resets at end-of-Sunday and the counter starts at zero again.

**Why.** Swells are not destinations. They are philosophies the user wants their life to feel full of — creativity, beauty, connection, freedom, good food — which require steady weekly feeding, not one-time completion. The one-shot-celebration framing implied that life-want goals get *finished*, which is the wrong frame and the wrong product. A weekly cycle matches how lives are already structured (work week / weekend), gives the diagnostic "which want am I feeding most?" a stable reference window, and pairs philosophically with the wave/tide vocabulary — Onduler is about rhythms.

**Sunday anchor.** Celebrations land during the Sunday window — a small emotional counterweight to Sunday-evening dread. A missed week is not punishment; it's a wave, and the app's posture stays "we'll be here when you're back."

**Motions can stay unassigned.** A motion does not have to feed a swell. The gap — motions you do daily that don't feed any stated want — is itself a useful diagnostic surface: the user either adds a swell to cover it, or asks whether the motion belongs in their daily life at all. Future feature, not in scope for the weekly-model session.

**Onboarding implication.** Swell-first, then motions per swell. The swell step is a noun-shaped menu of common life areas with custom add, replacing the current quick-start / build-your-own flow. Listing swells is required to engage with the app. The noun/verb framing surfaces explicitly in onboarding copy: "Swells are nouns. Motions are verbs." See ADR 0002. The onboarding rework is its own session after the weekly-model session lands.

**Canonical swell menu (10).** The seeded menu in onboarding is:

| Swell | Description |
|---|---|
| Movement | exercise, sport, walking, being in your body |
| Mind | meditation, journaling, reading, learning |
| Food | cooking, eating well, nourishment |
| Home | your space, comfort, domestic life |
| Family | partner, kids, parents, siblings |
| Friends | broader social life, community |
| Work | your livelihood, career, craft as profession |
| Money | finances, savings, side income |
| Creativity | making things, art, music, writing |
| Adventure | travel, novelty, trying new things |

The user can rename, recolor, deselect, or add custom swells. Descriptions are shown as sub-text under the swell name in the menu and disappear once the swell is picked.

**Schema impact.** `swells.target_points` and `swells.target_hours` now mean "per week." No `repeats` flag — one mode only. Cycle state is derived from `logs.logged_at` and the Sunday week definition, not stored on the swell. Lifetime totals can still be shown as a stat but do not drive celebration.

**Locked defaults.** 100 pts/week or 5 hrs/week in their respective modes (replaces the old 1000 pts / 10000 hrs lifetime defaults).

**Migration.** None required. Single-user (Josh), one week of data, no production users. Old swell targets get reinterpreted as weekly when the session ships.

### Swells are noun-shaped life areas, motions are verb-shaped actions (May 2026)

The mental model for users and copy is: **Swells are nouns. Motions are verbs.** A Swell is a noun-shaped area of life the user wants to invest in — Movement, Home, Food, Family, Creativity, Reflection, Work, Travel, and so on. A Motion is a verb-shaped daily action — kayak, cook, decorate, journal, make a playlist. The previous framing of Swells as "philosophies the user wants their life to feel full of" was poetically correct but freeze-inducing in practice; the noun/verb pattern unsticks users in one sentence.

**No schema change.** A Swell is still a row with a name and a weekly target. The reframing is in onboarding copy, default suggestions, and UI hints — not in the data model.

**Onboarding shift.** The swell step becomes a pick-then-add menu of common life areas with custom entry as a follow-up. The previously-planned open-ended "What do you want your life to feel like?" prompt is replaced. Motions are then added per swell.

**Contribution-weight default.** New motion→swell links default to `contribution_weight = 100`. The split-percentage affordance remains in the motion detail sheet but is not surfaced until the user has at least one link saved. In the noun-shape model, most users assign one swell per motion at full weight; weighted multi-swell contributions become an enrichment for users who want them, not a load-bearing requirement.

**Vocabulary unchanged.** The user-facing word stays "Swell." "Domains" remains on the never-use list. The noun-shape framing is an internal teaching pattern, not a rename.

ADR: `docs/decisions/0002-swells-are-nouns.md`.

## Working agreements

- Sessions are numbered. Session start = recap + next step. Session end = summary + queue next session.
- The trigger phrase is **"Onduler, go."**
- Not a pro dev. Walk through steps explicitly.
- Direct tone, no flattery, push back when wrong.
- Stack is locked unless something genuinely won't work.
- Surgical edits over full rewrites. A prior rewrite accidentally reverted visual design — that lesson is permanent.
- Apply vocabulary from this file consistently in all UI copy.
- Apply count-based pluralization in all UI strings.
- Follow the mirror principle in reports and empty states.
- **Swells are nouns, motions are verbs.** This is the teaching pattern that snaps the whole model into place. Apply it in onboarding copy, empty states, and any UI hint that orients a new user. Swell name suggestions are noun-shaped life areas (Movement, Home, Food, Family, Creativity, Reflection, Work, Travel, etc.); motion name suggestions are verb-shaped actions (kayak, cook, decorate, journal, make a playlist). See ADR 0002.
- **Internal design heuristic: skill-tree investment.** Onduler is internally modeled as a points-and-skill-tree system applied to real life — users invest in swells to build the kind of person they want to be. This is an internal design language, **not user-facing vocabulary**. Evaluate new features against the question: "does this make investing in your build feel rewarding without tipping into guilt or performance?" The surf-leaning voice, Tide/Wave/Swell/Motion words, and celebration-over-judgment posture stay locked at the user-facing surface. The RPG-style frame helps the designer reason about progression, builds, and "where am I over-investing this week" — it never appears in copy.
- **Bottom nav is the primary navigation on mobile; back is for sub-routes only.** Top-level pages reached via bottom nav (Today, Swells, Log, Settings) hide their back button at mobile widths — users navigate via bottom nav. Sub-routes (motion detail sheet, inline edit forms, Add Motion/Swell/Group, Settings group-edit) keep their back/cancel because there's no bottom-nav route back to them. Desktop shows back everywhere; mobile shows back only where the bottom nav can't get you back.
- **Every tap that triggers cross-page navigation needs press feedback at 0ms.** Bottom nav items, back/cancel links, and any "go somewhere" control must respond visually the instant the user touches them (`active:scale-[0.97]` or equivalent). Otherwise the inherent server-round-trip latency reads as broken. The press feedback doesn't make navigation faster; it makes the user feel heard.
- **Tracking currency is app-wide, not per-swell.** The user picks Points or Hours once in Settings — that choice flows to every surface in the app: daily progress bar, daily goal, swell targets, log/report stats. There's no mixed state where some swells are tracked in points and others in hours. Both `default_points` and `default_hours` are always populated on every motion (default 1 each), and both are recorded on every log row, so switching modes later doesn't lose data — only the displayed currency changes. Swell target defaults are **weekly**: 100 pts/week or 5 hrs/week in their respective modes. Users tune up or down from there based on what they want to feed and how heavily.
- **Swells run on a Sunday-anchored weekly cycle. One mode only.** Every swell has a weekly target. Celebration fires the moment cumulative weekly progress crosses the target. The cycle resets at end-of-Sunday — last week's total is preserved for historical view, this week's counter starts at zero. There is no "lifetime target, fire once, done" mode; that mental model is gone. Cycle state is *derived* from `logs.logged_at` and the Sunday week definition — not stored on the swell. Monthly views are a view-only zoom (four weekly bars stacked or summed); the celebration cycle stays weekly. Sunday is chosen deliberately: a small win lands during Sunday-evening dread, and a missed week is a wave, not a punishment.
- **Add-anything uses the keyboard-takes-over pattern, not bottom sheets.** Anywhere the user creates a new entity — motion, swell, group — tapping the "+" affordance immediately focuses a text input and the mobile keyboard fills the bottom half of the screen. The form (name field, optional secondary fields like pts/hrs/color) sits compactly above the keyboard. No modal chrome, no sheet animation, no header bar. The keyboard *is* the experience. Cancel via system back gesture or a small cancel control. The form should feel fast enough that the user can add five motions in fifteen seconds without thinking about the UI. Bottom sheets are reserved for editing existing entities (motion detail sheet), not for creation.
- **List-row visual treatment doesn't escalate to card chrome just to add interactivity.** A list of items rendered as plain rows (e.g., the group list under the Settings → Groups toggle) stays as plain rows even when each row becomes tappable to edit. Don't add borders, elevation, shadows, or container backgrounds to "signal" interactivity. The cursor change, subtle hover state, and inherent affordance of a list row are sufficient. This is part of the paper-list aesthetic — fewer visual containers, more breathing room.
- **Smart color defaults from the active theme palette.** Anywhere the UI offers a color picker (group color, swell color, future surfaces), the *default* color is randomly selected from the current theme's accent palette — not a hardcoded gray fallback. The user can always change it, but the default should set them up for success: pick a new group, get a color that already harmonizes with the theme they chose. This applies retroactively to any current color-pickable surface and prospectively to any new one.
- **Today page is a paper-list aesthetic.** Each motion row shows only its name, its points (or hours), and its checked state. Submotions, swell badges, group labels, and any other metadata are hidden until you open the detail sheet. The top of the page (date, score, daily progress bar) stays similarly minimal. Think: a to-do list someone wrote on a piece of paper, tracking their day's progress cleanly. Future feature work that introduces new metadata defaults to *not* surfacing it on the main row — if it needs to be visible by default, that's a deliberate decision and should be justified.
- **Always commit after completing work.** At the end of every task or logical chunk of work, create a git commit with a clear message. After committing, tell Josh how to push (e.g., `git push` or `git push -u origin <branch>`). Don't wait to be asked.
- When a Vercel deploy *should* have picked up changes but behavior suggests it didn't — especially after a schema migration — run `vercel --prod --force` to skip the build cache. Vercel's build cache can retain stale lambda artifacts even when source has changed, and SSR queries silently return empty against the old shape. Verified incident: May 2026 schema migration from `motion_groups` junction to `motions.group_id` FK. The deployed build kept restoring cache from a pre-migration build until `--force` was used. Always rebuild fresh after a schema shape change.
