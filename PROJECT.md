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
- Motion detail sheet: tap card body to open; shows submotions, add submotion form, hide toggle
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
