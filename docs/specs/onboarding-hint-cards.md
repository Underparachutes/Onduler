# Onduler — Onboarding Hint Cards Spec

**Date:** May 25, 2026
**Status:** Designed, not yet built.

## The core idea

After completing the formal onboarding flow, new users get dropped onto the Motions page with no orientation. The bottom-nav surfaces (Motions, Swells, Anchors, Settings) each carry their own model and vocabulary, and a brand-new user has no way to know what they're looking at, why Anchors is locked, or that swells can be colored and named after any person, place, or thing they want to feed.

This spec adds a small dismissible hint card to the top of each main surface, shown once per user per surface. The cards teach the model in two or three sentences each, in Onduler's voice, and never reappear.

## Why this shape

Inline cards instead of modal pop-ups. Modals interrupt. Cards sit in the page and let the user read or dismiss at their own pace, and they degrade gracefully if the user ignores them. They also match the paper-list aesthetic that the rest of the app holds to.

One card per surface instead of a multi-step tour. Onboarding is the tour. These cards are context the user can absorb on first arrival without being walked through anything.

Auto-dismiss on action where it makes sense. On Motions and Swells, the moment the user creates their first entity, the hint quietly fades. Action is the strongest signal that the teaching landed.

The Anchors-locked hint is the highest-leverage card. It answers the question "why is this tab here if I can't use it?" which is the first surface where a curious user feels confused.

## Per-surface copy

All copy is em-dash-free per the voice rule. Use periods, commas, or restructure.

### Motions

> **This is your list.**
>
> Motions are the verbs of your week, the things you do. Tap a row to log it. Tap the kebab to edit points, add it to a swell, or hide it.
>
> You decide what counts and how much. A 5-minute walk can be worth 1 point or 10. It's yours to weight.

### Swells

> **Your swells.**
>
> A swell is a noun-shaped area of your life. A person, a place, a thing you want to feed. Movement, Home, your dog, the band you're starting. Pick a color that feels like it. Set a weekly target.
>
> Your motions flow into your swells. Each motion can feed more than one.

### Anchors, locked (week 1, before first weekly ceremony unlocks)

> **Anchors unlocks after your first week.**
>
> This is where you'll see your wake, the shape of how you've been showing up. Nothing to do yet. Just keep logging.

### Anchors, unlocked (shown once, the first time the user lands on Anchors after the weekly ceremony unlocks)

> **You unlocked Anchors.**
>
> Each week you can drop an anchor, a marker for what you noticed. Onduler holds the mirror; you do the noticing.

### Settings (lowest priority, optional in v1)

> Everything's tunable here. Themes, tracking mode, your starter set. Nothing locked in.

## Behavior rules

**Show-once-per-user-per-surface.** Once dismissed, the card never reappears for that user on that surface. Persisted server-side so it carries across devices.

**Dismiss control is the `×` in the top-right corner of the card.** No "Got it" button. A button implies a checkpoint; `×` implies "this is just here if you want it."

**Auto-dismiss on first action.**
- **Motions** card auto-dismisses when the user creates their first motion (separate from the seeded onboarding motions; this is their first user-created or first user-edited motion).
- **Swells** card auto-dismisses when the user creates their first swell beyond the onboarding-seeded ones, or when they edit any seeded swell's name, color, or target.
- **Anchors-locked** card stays until the weekly cadence unlocks. It auto-clears at unlock; the unlocked card takes its place. This is the exception to the auto-dismiss-on-action rule because the whole point is to signal that something is coming.
- **Anchors-unlocked** card auto-dismisses when the user completes (or skips) their first weekly ceremony, or when they drop their first free anchor.
- **Settings** card auto-dismisses when the user changes any setting.

**Skip is always a door.** The `×` is present from the first frame. No "Next" between cards. Each surface stands alone.

**Don't auto-dismiss on scroll.** Scrolling past the card is not a signal that the user read it.

**No re-trigger on archive-and-fresh-start.** When a user archives their chapter and starts fresh, hint cards do not reappear. They are user-level orientation, not chapter-level.

## Visual treatment

Matches the paper-list aesthetic. No card chrome escalation.

- Background: `bg-th-surface`
- Border: `border border-th-border-soft`, no shadow
- Padding: `p-4`
- Rounded: `rounded-lg`
- Margin: `mb-4` to separate from the page content below
- Dismiss `×` in the top-right: small `text-th-muted`, `hover:text-th-text`, 32px tap target
- Title (bold first line) uses `font-semibold text-th-text`
- Body copy uses `text-th-secondary`, `text-sm`, `leading-relaxed`
- Press feedback on the `×`: `active:scale-[0.97]` per the press-feedback working agreement

The card should feel like a sticky note on a paper list, not a modal interruption.

## Schema change

Add one column to `user_settings`:

```sql
ALTER TABLE user_settings
ADD COLUMN hints_seen jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Shape:

```json
{
  "motions": true,
  "swells": true,
  "anchors_locked": true,
  "anchors_unlocked": true,
  "settings": true
}
```

Missing key means "not yet seen, card should render." Truthy value means "seen, do not render."

Migration script: `scripts/migrate-hints-seen.sql` (idempotent, transactional, follow the pattern of existing migration scripts).

## Server action

Add to `app/actions/settings.ts` (or wherever the closest existing settings actions live):

```ts
export async function markHintSeen(key: 'motions' | 'swells' | 'anchors_locked' | 'anchors_unlocked' | 'settings')
```

Behavior:
1. Read current `user_settings.hints_seen`.
2. Merge `{ [key]: true }` into it.
3. Write back.
4. Revalidate the page that the hint was on (or just `revalidatePath('/', 'layout')` since hints are layout-scoped).

The action should be optimistic-friendly. The client component fires it on `×` click and on auto-dismiss triggers, and updates local state immediately without waiting for the round-trip.

## Component shape

New file: `app/components/HintCard.tsx`.

```ts
type Props = {
  hintKey: 'motions' | 'swells' | 'anchors_locked' | 'anchors_unlocked' | 'settings'
  title?: string  // optional bold first line
  children: React.ReactNode  // body copy
  seen: boolean  // from server, gates initial render
}
```

Behavior:
- If `seen === true` on mount, render nothing.
- Otherwise render the card with the `×` dismiss.
- On dismiss, set local `dismissed` state to true (hides the card immediately) and fire `markHintSeen(hintKey)` in the background. No error UI; if the action fails, the card just reappears on next page load, which is acceptable.

## Per-page wiring

Each main page reads `hints_seen` from `user_settings` and passes the relevant key's seen-state to a `<HintCard>` mounted at the top of the page content.

**Motions** (`app/dashboard/page.tsx`)
- Mount `<HintCard hintKey="motions">` above the daily checklist.
- Auto-dismiss is wired in `app/actions/motions.ts.createMotion`: after a successful insert, call `markHintSeen('motions')` server-side. This way the card disappears on next page load whether or not the user dismissed it manually.

**Swells** (`app/swells/page.tsx`)
- Mount `<HintCard hintKey="swells">` above the swells list.
- Auto-dismiss is wired in `app/actions/swells.ts.createSwell` and `updateSwellDirect` (when name, color, or target_points / target_hours changes): after a successful write, call `markHintSeen('swells')` server-side.

**Anchors locked** (`app/anchors/components/LockedPage.tsx`)
- Mount `<HintCard hintKey="anchors_locked">` above the wake silhouette.
- No auto-dismiss in code. The card naturally stops rendering when `LockedPage` stops rendering (weekly ceremony unlocks → `app/anchors/page.tsx` switches to the unlocked view), at which point the unlocked card takes over. Set `markHintSeen('anchors_locked')` server-side inside the unlock logic so the locked card never reappears even if the user enters a wave and the locked view reappears later.

**Anchors unlocked** (`app/anchors/page.tsx`)
- Mount `<HintCard hintKey="anchors_unlocked">` above the radar.
- Auto-dismiss is wired in `app/actions/reflections.ts.saveReflection` (covers ceremony complete and ceremony skip-with-save) and `createFreeAnchor` (covers free-anchor drop).

**Settings** (`app/settings/page.tsx`)
- Mount `<HintCard hintKey="settings">` above the settings sections.
- Auto-dismiss is wired in whichever settings-update actions cover the toggles (theme change, tracking mode change, etc.). Acceptable to call `markHintSeen('settings')` from a small client-side handler on any settings input change instead of wiring it into every action.

## Edge cases

**Existing users.** All existing users get the cards on their next visit because `hints_seen` defaults to `{}`. This is the correct behavior: existing users have probably figured the app out, but the cards are quiet and dismissible, and the auto-dismiss-on-action triggers will silently clear them for anyone who's already active.

If we want to skip existing users entirely, the migration could backfill `hints_seen` to `{"motions": true, "swells": true, "anchors_locked": true, "anchors_unlocked": true, "settings": true}` for any user with `onboarding_complete = true` at migration time. Recommended: backfill, since existing testers don't need the orientation. New signups after the migration date get the cards naturally.

**The seeded onboarding motions and swells.** The Motions auto-dismiss should not trigger from the onboarding seeding step itself, only from a user-initiated `createMotion` call. If the onboarding seeding goes through `createMotion`, gate the `markHintSeen` call behind a flag or skip it when the call originates from onboarding. Cleanest path: have onboarding's bulk-insert action use a separate `seedMotions` / `seedSwells` helper that does not call `markHintSeen`, leaving the user-facing `createMotion` / `createSwell` to handle the auto-dismiss.

**Wide-screen layout.** The cards mount inside the existing per-page content column, so they pick up the sidebar layout at `md+` automatically. No special wide-screen treatment needed.

## Out of scope for v1

- No animation on appear or dismiss. Just show or hide. Animations would draw attention and undermine the "quiet note" feel.
- No tooltips on individual elements (the kebab, the daily progress bar, the calendar icon). If something needs explanation, the empty state should carry it. The hint cards teach the surface, not the controls.
- No multi-step guided tour and no "Next" button between cards.
- No analytics on hint dismissal. Not worth the tracking weight for v1; if hints turn out to be a problem we'll hear it from testers directly.
- No re-show option in Settings (no "Show hints again" toggle). Once-and-done is the contract.

## Acceptance check

- A brand-new signup completes onboarding and lands on Motions. The Motions hint card is visible at the top of the page.
- They tap `×` on the card. It disappears immediately. Refreshing the page does not bring it back.
- They navigate to Swells. The Swells hint card is visible. They create a new swell. The card disappears without them needing to dismiss it.
- They navigate to Anchors. The locked page shows the Anchors-locked hint card, plus the wake silhouette and existing locked-page copy.
- A week passes, the weekly ceremony unlocks. They return to Anchors. The unlocked Anchors hint card is visible. They complete a ceremony. The card does not reappear on next visit.
- They navigate to Settings. The Settings hint card is visible. They change the theme. The card disappears.
- No hint card reappears at any point during normal use. Archive-and-fresh-start does not bring them back.
- Em-dash count in shipped copy: 0.
