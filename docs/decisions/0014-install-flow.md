# ADR 0014 — Install Flow

**Date:** 2026-05-28
**Status:** Shipped

## Context

Onduler is a PWA. It works best installed on the home screen (no browser chrome, faster launch, survives tab pruning, feels like an app). First two testers never found the install path and used Onduler as a Safari tab. The existing discovery points (landing page link, Settings row) required the user to go looking.

## Decision

Three layers, ordered by leverage:

1. **Onboarding final step.** A new step after Personalize, shown only on mobile non-standalone browsers. iOS shows a three-step share-button tutorial with a downward arrow. Android triggers the native `beforeinstallprompt` when available, falls back to manual steps. Desktop and already-standalone users skip the step entirely. "Not now" proceeds to the dashboard.

2. **Recurring dashboard tile.** A small dismissible tile at the bottom of the Motions list for non-standalone mobile users. Cooldown ladder: first dismiss = 14 days, second = 30 days, third = permanent retire. Tile disappears permanently the moment standalone is detected. State lives in localStorage (device-scoped, not user-scoped).

3. **Settings row rename.** "Add to home screen" → "Install Onduler." Links to the existing `/welcome` reference page.

## Consequences

- Onboarding gains a fourth step (`install`) in the step type union. The step is purely client-side visual — no server state or schema change.
- `lib/install.ts` centralizes all platform detection, localStorage state, and the `beforeinstallprompt` event lifecycle.
- `app/components/InstallInstructions.tsx` is the shared tutorial component used by the onboarding step and the dashboard tile.
- The `/welcome` page remains a server-rendered reference page for the Settings link. It shows both platform sections since users may land there from any device.
- No schema changes. All state is device-local via localStorage.

## What we chose not to do

- Desktop install prompts. Onduler is mobile-first.
- Animated tutorials. Static is fine for v1.
- In-app browser detection (Instagram, Twitter). Edge case deferred.
- Push notification bundling. Notifications don't exist yet.
