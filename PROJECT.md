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
| **Swell** | A goal/target area — has an optional points target and/or hours target. Celebration fires when target is hit. Motions can belong to many swells. |
| **Group** | An organizational bucket for motions. No target, no scoring. Motions can belong to many groups. |
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
| `motions` | id, user_id, name, default_points, default_hours (default 1.0), parent_id (submotions), hidden, sort_order | parent_id enables submotions; hidden removes from daily checklist |
| `swells` | id, user_id, name, color, target_points (nullable), target_hours (nullable), sort_order | Either/both targets optional |
| `groups` | id, user_id, name, color, sort_order | Organizational only, no targets |
| `motion_swells` | motion_id, swell_id | Junction: many-to-many |
| `motion_groups` | motion_id, group_id | Junction: many-to-many |
| `logs` | id, user_id, motion_id, points, hours, logged_at | hours defaults to motion's default_hours at log time |
| `wave_checkins` | id, user_id, energy, alignment, duration_seconds, checked_in_at | |
| `user_settings` | user_id, groups_enabled, daily_goal, theme, celebration_enabled, haptic_enabled, onboarding_complete | |

## Current state of the build

**As of this session (May 2026), the following is working:**

- Auth (login / signup / sign out) — verified working on mobile (iOS)
- Onboarding flow (quick start + build your own) — verified working on mobile
- Dashboard: daily checklist with flat mode and groups mode, hide-done toggle, daily progress bar, wave detection
- Motions: create, edit (name/pts/hrs), delete, log, unlog, drag-to-reorder, hide/unhide
- Dashboard interaction model: tap card to log, long-press to drag-reorder, kebab opens detail sheet
- Motion detail sheet: edit name/pts/hrs, two-tap delete, swells chip assignment, groups chip assignment, submotions, unlog, hide toggle
- Submotions: create (via detail sheet), log/unlog independently; shown only in detail sheet (not checklist)
- Search: filter motions by name in flat mode checklist
- Groups: create, edit, delete, reorder (drag), enable/disable via settings toggle
- Swells: create, edit (name/color/target pts/target hrs), delete, assign motions via toggle chips, target progress bars
- Many-to-many: motions ↔ swells, motions ↔ groups
- Log (reports) page: period filter, stats, swells breakdown, daily chart, activity feed, waves
- Settings: theme picker, groups toggle, daily goal, celebration/haptic toggles
- Wave mode: 72hr auto-detection, manual wave return with WaveGrid check-in
- Data export: JSON download of all user data
- PWA: manifest, icons
- Themes: Default, Bolinas, Biarritz
- Bottom nav: Today / Swells / Log / Settings, persistent across app pages

**Deferred / not yet built:**
- Submotion budget model (submotions share parent's pts pool — needs schema + UX design)
- Groups assignment UX (easier to assign existing motions to groups — model TBD)
- Swell target celebration trigger (progress bars show, but no celebration fires on completion)
- Bolinas theme (visual design system not implemented — current "Bolinas" is a placeholder)
- Stripe / monetization

## Roadmap (next sessions)

| Session | Goal |
|---|---|
| **Next** | Swell target celebration trigger — fire celebration when cumulative pts/hrs hits target |
| **After** | Submotion budget model — submotions share parent's points pool |
| **After** | Groups assignment UX — decide model, build assignment from motion card or group page |
| **After** | Bolinas theme design system |
| **After** | Stripe, premium gating, additional themes |
| **After** | LLM-assisted import — user prompts their LLM with an Onduler-provided template, uploads the markdown output, Onduler bulk-creates swells/motions/groups |

## Decisions

### Groups vs Swells (May 2026)

Groups and Swells solve non-overlapping problems and should not be collapsed into one concept.

- **Groups** are organizational containers. One motion belongs to one group (or none). Pure UX utility — they help the user mentally cluster and filter their motions. They answer the question *where does this live in my list?*
- **Swells** are aspirational goals. A motion can contribute to many swells; a swell is fed by many motions. Each motion→swell link carries its own `contribution_weight`, enabling the additive points model (e.g., meditation can contribute 100% to "be healthy" and 40% to "be a better partner" simultaneously). They answer the question *why does this matter?*

Locked schema target:

```
groups        (id, user_id, name, sort_order)
motions       (id, user_id, group_id NULLABLE, name, base_points, ...)
swells        (id, user_id, name, target, ...)
motion_swells (motion_id, swell_id, contribution_weight)
```

`group_id` on motions is nullable — ungrouped motions are fine, especially early on when a user is still figuring out their categories.

**Why this matters.** Most habit apps either have flat lists (no organization) or single-goal tagging (no additive credit). Collapsing Groups and Swells would either lose the additive points benefit (if everything became 1:many) or make the motion list unscannable (if everything became many:many). The two-concept model is Onduler's distinctive structural choice — don't propose simplifying it away.

**Implementation gap (as of May 2026).** Current production schema does NOT match this target. It uses a `motion_groups` many-to-many junction (no `group_id` column on motions) and `motion_swells` has no `contribution_weight` column. A migration is needed to reach the locked shape. The cross-group drag-and-drop work should target the locked shape — `UPDATE motions SET group_id = ...` directly rather than juggling the junction.

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
- **Bottom nav is the primary navigation on mobile; back is for sub-routes only.** Top-level pages reached via bottom nav (Today, Swells, Log, Settings) hide their back button at mobile widths — users navigate via bottom nav. Sub-routes (motion detail sheet, inline edit forms, Add Motion/Swell/Group, Settings group-edit) keep their back/cancel because there's no bottom-nav route back to them. Desktop shows back everywhere; mobile shows back only where the bottom nav can't get you back.
- **Every tap that triggers cross-page navigation needs press feedback at 0ms.** Bottom nav items, back/cancel links, and any "go somewhere" control must respond visually the instant the user touches them (`active:scale-[0.97]` or equivalent). Otherwise the inherent server-round-trip latency reads as broken. The press feedback doesn't make navigation faster; it makes the user feel heard.
- **Tracking currency is app-wide, not per-swell.** The user picks Points or Hours once in Settings — that choice flows to every surface in the app: daily progress bar, daily goal, swell targets, log/report stats. There's no mixed state where some swells are tracked in points and others in hours. Both `default_points` and `default_hours` are always populated on every motion (default 1 each), and both are recorded on every log row, so switching modes later doesn't lose data — only the displayed currency changes. Defaults stay deliberate: 1000 pts (≈ 40 days at 25 pts/day, habit-formation horizon) or 10000 hrs (Gladwell mastery threshold) as the swell target default in their respective modes. Most users will leave hours at the default and accumulate a passive baseline.
- **Add-anything uses the keyboard-takes-over pattern, not bottom sheets.** Anywhere the user creates a new entity — motion, swell, group — tapping the "+" affordance immediately focuses a text input and the mobile keyboard fills the bottom half of the screen. The form (name field, optional secondary fields like pts/hrs/color) sits compactly above the keyboard. No modal chrome, no sheet animation, no header bar. The keyboard *is* the experience. Cancel via system back gesture or a small cancel control. The form should feel fast enough that the user can add five motions in fifteen seconds without thinking about the UI. Bottom sheets are reserved for editing existing entities (motion detail sheet), not for creation.
- **List-row visual treatment doesn't escalate to card chrome just to add interactivity.** A list of items rendered as plain rows (e.g., the group list under the Settings → Groups toggle) stays as plain rows even when each row becomes tappable to edit. Don't add borders, elevation, shadows, or container backgrounds to "signal" interactivity. The cursor change, subtle hover state, and inherent affordance of a list row are sufficient. This is part of the paper-list aesthetic — fewer visual containers, more breathing room.
- **Smart color defaults from the active theme palette.** Anywhere the UI offers a color picker (group color, swell color, future surfaces), the *default* color is randomly selected from the current theme's accent palette — not a hardcoded gray fallback. The user can always change it, but the default should set them up for success: pick a new group, get a color that already harmonizes with the theme they chose. This applies retroactively to any current color-pickable surface and prospectively to any new one.
- **Today page is a paper-list aesthetic.** Each motion row shows only its name, its points (or hours), and its checked state. Submotions, swell badges, group labels, and any other metadata are hidden until you open the detail sheet. The top of the page (date, score, daily progress bar) stays similarly minimal. Think: a to-do list someone wrote on a piece of paper, tracking their day's progress cleanly. Future feature work that introduces new metadata defaults to *not* surfacing it on the main row — if it needs to be visible by default, that's a deliberate decision and should be justified.
- When a Vercel deploy *should* have picked up changes but behavior suggests it didn't — especially after a schema migration — run `vercel --prod --force` to skip the build cache. Vercel's build cache can retain stale lambda artifacts even when source has changed, and SSR queries silently return empty against the old shape. Verified incident: May 2026 schema migration from `motion_groups` junction to `motions.group_id` FK. The deployed build kept restoring cache from a pre-migration build until `--force` was used. Always rebuild fresh after a schema shape change.
