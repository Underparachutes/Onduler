# Onduler — State of the Project

*Last updated: May 2026*

## The big picture

**Onduler** (*on-doo-LAY* — French for "to wave") is a gamified personal fulfillment app built around points-based habit tracking across life domains. The goal is to bring balance to life by helping you track where you spend your energy. Domain owned: **onduler.app**.

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
| **Waypoint** | A user-authored marker within a swell — a point the user is navigating toward inside the swell's ongoing rhythm, not an endpoint of it. Two kinds: recurring (e.g. publish weekly) and one-shot (e.g. start a band). Completing a waypoint celebrates and may add bonus points to the swell. Internal table name remains `milestones`. See ADRs 0004 and 0006. |

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
| `milestones` | id, user_id, swell_id, name, kind, cadence, target_count, completed_at, bonus_points, sort_order | User-facing name: **Waypoint** (table stays `milestones`, see ADR 0006). kind in (recurring, one_shot); recurring uses cadence + target_count; one_shot uses completed_at. See ADR 0004 |
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
- Onboarding archetype starter packs: 2×2 grid above the swell list (The Maker / The Athlete / The Wanderer / The Scholar — Caretaker dropped pending naming pre-launch). Tap a pack to pre-pick its three swells; tap the active pack again to clear. Picked swells sort to the top of the list so selections cluster together. Active pack highlight clears when user modifies picks. Each theme palette bumped to 10 colors; onboarding seeds the 10 swells from a shuffled palette so each gets a distinct color
- Per-swell proficiency view (`/swells/[id]`): header (color dot + name + this-week tide bar + lifetime stat line "N pts · M weeks running") + Motions section with constellation/list toggle + Milestones section. Constellation = swell node at center showing value/target for the active time window, motion nodes around it sized by points earned in that window (loudest = largest), stroke and text opacity encode recent activity (week > month > lifetime > none), earned value (points or hours) inside each node so the nodes visually sum to the center, motion name label below; tooltip surfaces both value and log count, cap-8 with "+ N more" overflow to list view. Time-view toggle (Week / Month / Lifetime) drives both per-node values and the center text: Week = weekly value/target, Month = calendar-month value / `ceil(weekly_target × days_in_month / 7)`, Lifetime = lifetime value / `ceil(weekly_target × weeks_since_first_log)` (falls back to absolute lifetime total when `weeks_since_first_log ≤ 1` — ADR 0005). Milestones support recurring (weekly/monthly cadence) and one-shots (complete/uncomplete toggle); completed one-shots collapse under "N finished milestones ↓"; names are inline-editable. The list-row swell on /swells navigates here; inline-expand is gone. Schema: new `milestones` table. Drag-to-arrange was tried and dropped — labels + size-by-points read better; `motion_swells.position_x/y` columns were added and then removed in the same session
- Settings build picker (`/settings/shape`): "Your shape" sub-route surfaced from a row on the Settings page (sits right under Appearance, summarizing the current shape). Two slots — primary and secondary — over a 2×2 preset gallery (The Maker / The Athlete / The Wanderer / The Scholar). Both slots are optional and NULL by default; secondary is the multi-classing entry (slot only in v1, blending math is deferred to the Logs redesign). Tapping a preset opens a preview/diff listing the preset's seeded swells with "have"/"new" badges and per-row opt-out checkboxes, then two CTAs ("Set as primary" / "Set as secondary"). Confirming creates only the opted-in new swells with theme-palette colors and weekly target defaults matching the user's tracking mode, never touching existing swells. Clearing a slot nulls the preference without touching any data. Schema: `user_settings.primary_build`, `user_settings.secondary_build` (both nullable text). Preset definitions live in `lib/builds.ts`; onboarding's archetype packs now read from the same shared source of truth
- Toggle-active contrast pairing: active segmented buttons use `bg-th-text` + `text-th-bg` so the inversion works in light and dark themes. The old pattern (`text-th-btn-text` = always white) broke in any theme where `--th-text` is light
- Normalized contribution model (ADR 0003): a motion's `contribution_weight` across its swells sums to ≤100%. Toggling a swell on uses the remaining capacity as the default (no more silent 100%/100% double-counting). Editing one swell's % auto-rebalances the other swells on the same motion proportionally so the total stays unchanged. Motion detail sheet shows a quiet "X% allocated · Y% remaining" indicator next to the Swells label. `setMotionSwells` normalizes server-side as a safety net. One-time renormalization SQL ran 2026-05-17 — two motions (Meditate, Spend time outside) were at 100/100 across two swells, both became 50/50. Shared helpers live in `lib/contributions.ts`
- Logs radar (`/log`, floating above the existing report sections — no panel chrome): N-gon of pie-slice wedges (one per swell, ordered by `sort_order`, starting top and going clockwise), each in its swell color at 0.34 fill opacity. On top of each wedge, a filled "slice" in the same color at 0.65 opacity scales radially with this week's actual value — reads like a fuel gauge inside the wedge. Wedge + slice share boundary geometry on the bisector radials at `axis_angle ± π/N`; wedge corners sit at the chord-bisector intersection `2 R_a R_b cos(π/N) / (R_a + R_b)`, which reduces to the regular-kite case when adjacent targets are equal. A 3N-vertex shoulder polygon strokes the perimeter — the "dive" between unequal neighbors stays on the boundary radials so a low-axis wedge never visually empties out a high-axis neighbor (the v1 bug). Each target vertex is drag-handleable (radial-axis projection, ghost dot + dashed leader, live drag pill bottom-left); persists via a focused `updateSwellTarget(id, currency, value)` server action. Reset-to-build chip bottom-right opens a per-row opt-out dialog. Multi-class chip above the chart reads "{primary} + {secondary}" (single-build users don't see it). Wave-week wash + ramp pill render when the current week intersects a `wave_checkins` row (ramp wiring deferred to the welcome-back session — defaults to 100%). Pure helpers in `lib/radar.ts`, component at `app/components/SwellRadar.tsx`. Subtitle copy follows the period filter ("Your swells this week / this month / over time"); both the radar and the report sections respond to the filter as of ADR 0005. Hide-hidden filter and per-wedge long-press menu deferred per spec (gated until `swells.hidden` ships)
- Swells page weekly aggregate softened (header total at `text-sm`, progress bar 3px tall on `bg-th-border`, denominator readout at `text-[10px]`): the teaching denominator stays visible but no longer reads as the loudest stat on the page now that the Logs radar surfaces the same teaching signal more legibly
- Period-aware Logs radar + calendar-month math (ADR 0005): the radar now honors the `/log` period filter. `This week` keeps the existing Sunday-anchored weekly view. `This month` anchors to the calendar month (1st-of-month → today) with targets derived at render via `ceil(weekly × days_in_month / 7)`, month-to-date actuals, and a `Wave month` pill when there's a 7+ consecutive zero-log day streak inside the month. `All time` is read-only — drag disabled, static handles — with targets = `ceil(weekly × weeks_since_first_log)` and fallback to absolute totals when `weeks_since_first_log ≤ 1`. Drag still edits the weekly source-of-truth from any view (monthly drag converts display×7/days_in_month back to weekly with weekly-step rounding); the live pill on monthly reads `{Swell} · 222 pts/mo · 50 pts/wk`. Reset-to-build diff dialog mirrors the same `monthly (weekly)` format on month view. Filter labels: `This week / This month / All time`. Proficiency view's Month tab switched from rolling-4-weeks to calendar-month using the same helpers. Pure helpers in `lib/periods.ts` (daysInMonth, monthStartKey, weeksSinceFirstLog, consecutiveZeroDayStreak, monthlyTargetDisplay, lifetimeTargetDisplay, ceilDisplay, pacificDayKey, dayKeyRange)
- Ceil display rule applied (ADR 0005 §6): every visible target / actual / percentage is `ceil`'d for display — log page totals/avg/swell breakdown/daily chart rows/recent entries, radar drag pill + reset dialog, proficiency view formatValue + center text + constellation node values, swells page weekly aggregate (header + progress percentage), per-swell row weekly progress, daily checklist progress percentage. Points mode rounds up to whole integers; **hours mode rounds up to 0.25 hr** (15-min calendar blocks, the granularity all hour inputs across the app already use) so a 0.5 hr/wk target doesn't render as "1 hr". `ceilDisplay`, `monthlyTargetDisplay`, and `lifetimeTargetDisplay` in `lib/periods.ts` take an `isHours` flag. Polygon geometry still runs on unrounded floats so vertices land in the right pixel; only the displayed numbers round. Allocation-percentage displays in the motion detail sheet stay on `Math.round` — proportional inventory that must sum to 100, not celebration metrics
- Waypoints rename (ADR 0006): user-facing "Milestone(s)" → "Waypoint(s)" on the per-swell proficiency view — section header, add aria-label, empty state, finished-collapse count. Schema (`milestones` table), action file (`app/actions/milestones.ts`), component (`MilestonesSection.tsx`), and type (`Milestone`) names stay per the internal/external split already in use for build/shape. Empty-state copy also dropped "goal" (on the never-use list); now reads "No waypoints yet. Add one to mark something you're navigating toward."
- Export translates to user vocabulary (ADR 0006): `/api/export` now includes waypoints (previously missing entirely — real data-loss surface for backup), and translates top-level keys to user-facing words: `wave_checkins` → `waves`, new `waypoints` array sourced from `milestones`. Motion→swell contributions nest inside each motion as `swells: [{ swell_id, weight }]` rather than a top-level `motion_swells` junction — reads as "this motion feeds these swells with these weights" instead of a junction-table dump. Foreign-key field names (`swell_id`, `motion_id`) stay as join handles. Filename / `exported_at` / `user_email` unchanged

**Deferred / not yet built:**
- Bolinas theme (visual design system not implemented — current "Bolinas" is a palette swap on a placeholder)
- Stripe / monetization

## Roadmap (next sessions)

| Session | Goal |
|---|---|
| **Next** | Wave / build interaction — welcome-back screen after WaveGrid check-in with two doors (Ease back in / Pick up your [shape]) plus a small "Try a different shape" link. Auto-selected minimum-viable-shape (top 2 most-logged motions per shape) with Settings affordance to drop, swap, or add anchors. Pair fixes (build picker + proficiency view polish, since this session re-opens both surfaces): make the full "Your shape" row tappable in Settings (currently only the chevron registers); add an all-HAVE empty-state to the build preview (when 100% of a preset's swells already exist, drop the opt-out grid and read "All N already in your set — set as primary"); bump constellation node-label contrast on the proficiency view so motion names under each node are legible in dark mode; make waypoint `kind` editable in the waypoint edit form (currently set-at-creation with no toggle to flip recurring ↔ one-shot — surfaced from the May 2026 personal-setup pass; clear the inactive kind's fields on flip, no migration needed at one user / no production data). See ADR 0004. |
| **After** | Motion-side cadence + waypoint completion loop — motion detail sheet gets a Cadence section so recurring weekly/monthly targets can be set directly on the motion (e.g., "Meditate 5x/week"). Under the hood, creates/updates a recurring waypoint (table: `milestones`) on the motion's primary swell (highest contribution_weight; secondary-swell override surfaced when the motion feeds multiple). Progress advances automatically from logs of the linked motion in the current cycle — no manual check-off. Edit/remove cadence from either surface (motion sheet or per-swell proficiency view); both stay in sync. Preserves the swell-anchored waypoint model — waypoints still live on swells in the data model; this is a create/edit shortcut, not a data-model split. One-shots not included on the motion-side form (aspirational, not cadence-shaped). Schema: `milestones.motion_id` nullable FK becomes load-bearing for recurring (already implied by ADR 0004's "progress crumb from a linked motion" for one-shots). Surfaced from the May 2026 personal-setup pass — the swell-tab detour to set a cadence on a 1:1 motion hit as repeat friction. **Also closes the loop on ADR 0004's bonus-points promise** (currently the spec says "completing a waypoint celebrates and may add bonus points to the swell" but `milestones.bonus_points` is an inert column — never set on create, never awarded on completion): (a) bonus-points input on waypoint create/edit (applies to recurring and one-shots), (b) on completion — one-shot toggled, or recurring cycle hit — the bonus_points value accumulates onto the swell's totals (week and lifetime) and triggers the existing celebration, (c) manual mark-complete control for recurring waypoints that don't have a linked motion (auto-progress only fires for the linked case; unlinked recurring still needs a way to tap "this week's cadence is hit"), (d) recurring rows get the partial-ring progress visual called out in ADR 0004. |
| **After** | `swells.hidden` flag + UI — let users hide a swell when focus shifts without losing logs or motions; quiet "Hidden swells" section to restore. Paired with whatever surface first needs it (likely the build picker once we want presets to suggest hiding swells the shape doesn't seed). |
| **After** | Bolinas theme design system — current Bolinas is a palette swap on the default visual layout; build the full visual design system (typography, surface treatment, accents, motion) so the theme feels distinct from Default |
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

**Four preset shapes** ship as placeholders: The Maker (Creativity, Work, Mind), The Athlete (Movement, Food, Mind), The Wanderer (Adventure, Movement, Creativity), The Scholar (Mind, Work, Creativity). Caretaker is dropped pending naming pre-launch. Users always retain the "build your own shape" path.

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

## Working agreements

- Sessions are numbered. Session start = recap + next step. Session end = summary + queue next session.
- The trigger phrase is **"Onduler, Onduler."**
- Not a pro dev. Walk through steps explicitly.
- Direct tone, no flattery, push back when wrong.
- Stack is locked unless something genuinely won't work.
- Surgical edits over full rewrites. A prior rewrite accidentally reverted visual design — that lesson is permanent.
- Apply vocabulary from this file consistently in all UI copy.
- Apply count-based pluralization in all UI strings.
- **Ceil display rule — points mode shows whole integers; hours mode shows 0.25 hr (15-min) precision.** Every number that renders (targets, actuals, ratios, percentages) is `ceil`'d for display: in **points mode**, to whole units (no decimals reach the screen); in **hours mode**, to 0.25 hr — 15-minute calendar blocks, the granularity all hour inputs across the app already use (motion form, swell form, motion detail sheet). A 30-min target reads as "0.5 hr"; a 45-min walk reads as "0.75 hr". 0.1 hr was tried briefly and rejected — 0.3 / 0.7 hour readings don't map to a familiar time chunk, while quarter-hours do. Underlying state stays precise — radar polygon geometry uses unrounded floats so vertices land in the right pixel — only the display rounds. `ceil` rather than `round` because the slight upward bias matches the celebration-leaning posture (target is slightly higher than the true float; actuals are slightly higher than the true sum). Use `ceilDisplay(n, isHours)` / `monthlyTargetDisplay(weekly, today, isHours)` / `lifetimeTargetDisplay(weekly, weeks, isHours)` from `lib/periods.ts`. Allocation-percentage displays in the motion detail sheet stay on `Math.round` — proportional inventory that must sum to 100, not celebration metric. Applies app-wide. See ADR 0005.
- Follow the mirror principle in reports and empty states.
- **Swells are nouns, motions are verbs.** This is the teaching pattern that snaps the whole model into place. Apply it in onboarding copy, empty states, and any UI hint that orients a new user. Swell name suggestions are noun-shaped life areas (Movement, Home, Food, Family, Creativity, Reflection, Work, Travel, etc.); motion name suggestions are verb-shaped actions (kayak, cook, decorate, journal, make a playlist). See ADR 0002.
- **Internal design heuristic: skill-tree investment.** Onduler is internally modeled as a points-and-skill-tree system applied to real life — users invest in swells to build the kind of person they want to be. This is an internal design language, **not user-facing vocabulary**. Evaluate new features against the question: "does this make investing in your build feel rewarding without tipping into guilt or performance?" The surf-leaning voice, Tide/Wave/Swell/Motion/Waypoint words, and celebration-over-judgment posture stay locked at the user-facing surface. The RPG-style frame helps the designer reason about progression, builds, and "where am I over-investing this week" — it never appears in copy.
- **Builds are suggestions, never prescriptions.** Any build/shape feature — preset packs, suggested motions, waypoint templates, target recommendations — curates the menu of what counts and never weights how much specific motions count. The build can propose adding self-care motions to a Caretaker shape; it cannot say "your self-care motions are worth more than someone else's." Two firewalls: (a) builds expand the menu, never modify motion math; (b) every build proposal is individually opt-out-able with full visibility before commit. The user is always the author; the build is a tray of starting points. The minute a build feature drifts toward "you should be doing X," it has slipped into the prescription failure mode and needs to be reworked. See ADR 0004.
- **Data exports use user-facing vocabulary, not schema column names.** Exports (the current JSON download at `/api/export`, and any future format) label data with the words the user sees in the UI — Waypoint, Swell, Motion, Group, Tide, Wave — not internal table names like `milestones` or `motion_swells`. The schema and code identifiers stay where they are; the export is a translation layer. When a user opens their exported file, they should recognize the words. Same internal/external split already used for build/shape and milestone/waypoint. See ADR 0006.
- **Bottom nav is the primary navigation on mobile; back is for sub-routes only.** Top-level pages reached via bottom nav (Today, Swells, Log, Settings) hide their back button at mobile widths — users navigate via bottom nav. Sub-routes (motion detail sheet, inline edit forms, Add Motion/Swell/Group, Settings group-edit) keep their back/cancel because there's no bottom-nav route back to them. Desktop shows back everywhere; mobile shows back only where the bottom nav can't get you back.
- **Every tap that triggers cross-page navigation needs press feedback at 0ms.** Bottom nav items, back/cancel links, and any "go somewhere" control must respond visually the instant the user touches them (`active:scale-[0.97]` or equivalent). Otherwise the inherent server-round-trip latency reads as broken. The press feedback doesn't make navigation faster; it makes the user feel heard.
- **Tracking currency is app-wide, not per-swell.** The user picks Points or Hours once in Settings — that choice flows to every surface in the app: daily progress bar, daily goal, swell targets, log/report stats. There's no mixed state where some swells are tracked in points and others in hours. Both `default_points` and `default_hours` are always populated on every motion (default 1 each), and both are recorded on every log row, so switching modes later doesn't lose data — only the displayed currency changes. Swell target defaults are **weekly**: 100 pts/week or 5 hrs/week in their respective modes. Users tune up or down from there based on what they want to feed and how heavily.
- **Swells run on a Sunday-anchored weekly cycle. One mode only.** Every swell has a weekly target. Celebration fires the moment cumulative weekly progress crosses the target. The cycle resets at end-of-Sunday — last week's total is preserved for historical view, this week's counter starts at zero. There is no "lifetime target, fire once, done" mode; that mental model is gone. Cycle state is *derived* from `logs.logged_at` and the Sunday week definition — not stored on the swell. Monthly views are a view-only zoom (four weekly bars stacked or summed); the celebration cycle stays weekly. Sunday is chosen deliberately: a small win lands during Sunday-evening dread, and a missed week is a wave, not a punishment.
- **Add-anything uses the keyboard-takes-over pattern, not bottom sheets.** Anywhere the user creates a new entity — motion, swell, group — tapping the "+" affordance immediately focuses a text input and the mobile keyboard fills the bottom half of the screen. The form (name field, optional secondary fields like pts/hrs/color) sits compactly above the keyboard. No modal chrome, no sheet animation, no header bar. The keyboard *is* the experience. Cancel via system back gesture or a small cancel control. The form should feel fast enough that the user can add five motions in fifteen seconds without thinking about the UI. Bottom sheets are reserved for editing existing entities (motion detail sheet), not for creation.
- **List-row visual treatment doesn't escalate to card chrome just to add interactivity.** A list of items rendered as plain rows (e.g., the group list under the Settings → Groups toggle) stays as plain rows even when each row becomes tappable to edit. Don't add borders, elevation, shadows, or container backgrounds to "signal" interactivity. The cursor change, subtle hover state, and inherent affordance of a list row are sufficient. This is part of the paper-list aesthetic — fewer visual containers, more breathing room.
- **Smart color defaults from the active theme palette.** Anywhere the UI offers a color picker (group color, swell color, future surfaces), the *default* color is randomly selected from the current theme's accent palette — not a hardcoded gray fallback. The user can always change it, but the default should set them up for success: pick a new group, get a color that already harmonizes with the theme they chose. This applies retroactively to any current color-pickable surface and prospectively to any new one.
- **Today page is a paper-list aesthetic.** Each motion row shows only its name, its points (or hours), and its checked state. Submotions, swell badges, group labels, and any other metadata are hidden until you open the detail sheet. The top of the page (date, score, daily progress bar) stays similarly minimal. Think: a to-do list someone wrote on a piece of paper, tracking their day's progress cleanly. Future feature work that introduces new metadata defaults to *not* surfacing it on the main row — if it needs to be visible by default, that's a deliberate decision and should be justified.
- **Today is the daily ritual surface; Swells is the strategic surface.** Today stays paper-light because it's where the user shows up every day to tap motion boxes and move on — any structural complexity introduced here would break the ritual. Swells is where structural depth belongs: per-swell proficiency views, motion constellations, waypoints, time-view zooms, build context. The user goes to Swells to *tune their shape*; they go to Today to *do the work*. Settings carries one-time configuration. The Logs page carries diagnostics. This four-surface split is how Onduler scales as users invest more without ever becoming exhausting. New features get evaluated against this split — "which surface does this belong on?" is a real question, and the answer is rarely Today. See ADR 0004.
- **Always commit after completing work.** At the end of every task or logical chunk of work, create a git commit with a clear message. After committing, tell Josh how to push (e.g., `git push` or `git push -u origin <branch>`). Don't wait to be asked.
- When a Vercel deploy *should* have picked up changes but behavior suggests it didn't — especially after a schema migration — run `vercel --prod --force` to skip the build cache. Vercel's build cache can retain stale lambda artifacts even when source has changed, and SSR queries silently return empty against the old shape. Verified incident: May 2026 schema migration from `motion_groups` junction to `motions.group_id` FK. The deployed build kept restoring cache from a pre-migration build until `--force` was used. Always rebuild fresh after a schema shape change.
