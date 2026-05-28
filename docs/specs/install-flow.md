# Onduler — Install Flow Feature Spec

**Date:** May 28, 2026
**Status:** Designed, not yet built. Queued as next session.

## The problem

Onduler is a PWA. It lives best on the home screen (no browser chrome, faster launch, feels like an app instead of a tab, survives Safari tab-pruning). Today the only discovery paths to install instructions are:

- A small "On a phone? Install Onduler" link on the landing page above the email field
- An "Install" link in the landing page footer
- A "Add to home screen" row in Settings

All three require the user to go looking. A new tester who signs up on iOS Safari lands on `/dashboard` and never sees any prompt. They use Onduler as a Safari tab, which loses scroll position, gets buried, doesn't feel like a daily ritual surface, and undermines the whole daily-ritual posture. First two testers exhibited this pattern.

## The fix in one sentence

Show the install prompt at the moment the user is most invested (post-onboarding), keep a quiet recurring tile for users who skipped, and let the existing Settings row stay as the permanent reference.

## Three layers

### Layer 1 — Onboarding final step (primary fix)

A new step added to the end of the onboarding flow, after Personalize, before the user lands on `/dashboard` for the first time. The user has just spent real time setting up their swells and motions. They've decided they want this thing. This is the highest-leverage moment in the entire app lifecycle to ask for install.

Copy:

> **Install Onduler**
>
> Onduler lives best on your home screen. Add it once and it opens like an app.

Below the copy, platform-adaptive content:

**iOS Safari**: illustrated three-step tutorial.
1. Tap the share button (small icon hint, the square with an up-arrow).
2. Scroll down and tap "Add to Home Screen."
3. Tap "Add" in the top right.

Below the steps: an arrow pointing down toward the screen-bottom share button (works because Safari's share button is at the bottom of the screen on iPhone). This is the standard PWA-install tutorial pattern; libraries like `react-add-to-homescreen` and `pwa-install` use it.

**Android Chrome**: a single "Install" button that triggers the native install prompt (using the stashed `beforeinstallprompt` event).

**Desktop or unsupported browsers**: skip the entire layer. Land directly on dashboard. No prompt.

**Already standalone (somehow)**: skip the layer. Land directly on dashboard.

Skip button below: "Not now" → land on dashboard. Per the working agreement "Skip is always a door," this must be present.

### Layer 2 — Recurring dashboard tile (quiet re-emergence)

A small dismissible tile that appears at the bottom of the Motions list (below the last motion row, above the bottom nav) for non-standalone users who skipped install at onboarding.

Trigger: first show when the user has logged 3 motions OR returned for a second session, whichever comes first.

Copy:

> Onduler lives best on your home screen.
>
> [Show me how]  [Not now]

"Show me how" opens the same platform-adaptive tutorial as Layer 1 (could share the component, rendered as a sheet on the Motions page).

"Not now" dismisses the tile and sets a 14-day cooldown timestamp in localStorage. After 14 days, the tile returns once. If dismissed again, 30-day cooldown. After third dismiss, retire to Settings-only.

The moment standalone is detected (user installed), the tile is permanently gone. This is the canonical anti-annoyance signal: if you've installed, you never see it again, even on the same device.

Treatment: matches the paper-list aesthetic. Subtle border, no shadow, no elevation. Like a quiet row at the end of the list, not a banner across the top.

### Layer 3 — Settings row stays

Already shipped. Already at Settings → "Add to home screen." Rename to **"Install Onduler"** so the label matches the rest of the install copy. Behavior unchanged: opens `/welcome`.

## Detection logic

```typescript
// Already installed
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true

// Platform sniff
const ua = navigator.userAgent
const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
const isAndroid = /Android/.test(ua)
const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)

// Android programmatic install
let deferredPrompt: BeforeInstallPromptEvent | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
})

// Trigger Android install
async function triggerAndroidInstall() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome // 'accepted' | 'dismissed'
}

// Listen for completed install
window.addEventListener('appinstalled', () => {
  // mark installed in localStorage so tile vanishes immediately
})
```

## State persistence

All state lives in `localStorage`. Install state is device-specific (a user might use Onduler on phone and desktop separately), so device-scoped storage is the right shape. No schema change.

Keys:

- `onduler_install_onboarding_seen` — boolean. Set when Layer 1 is shown.
- `onduler_install_dismissed_at` — ISO timestamp. Set on every "Not now."
- `onduler_install_dismiss_count` — integer. Increments on each dismiss; controls cooldown ladder.
- `onduler_install_completed` — boolean. Set on `appinstalled` event or first standalone detection.

Cooldown ladder:
- 0 dismisses: show on trigger.
- 1 dismiss: re-show after 14 days.
- 2 dismisses: re-show after 30 days.
- 3+ dismisses: never auto-show again. Settings-only.

If `onduler_install_completed === true` OR standalone is detected at runtime: never show. Both are checked. The `appinstalled` event is more reliable on Android; standalone detection is more reliable on iOS (which doesn't fire `appinstalled`).

## Voice and posture

Framed as enabling, not nudging. "Onduler works best from your home screen" reads as the app explaining itself. "Don't forget to install Onduler" or "Get reminded daily" reads as a coach.

Voice check (from PROJECT.md working agreements):

- "Witness, not coach" — install is utility, not behavioral nudge. Passes.
- "Skip is always a door" — every layer has a skip path. Passes.
- "No em dashes in user-facing copy" — copy uses periods and commas only. Passes.

What's explicitly *not* in voice:

- "Install now for the full experience" (coaches the user into feeling deprived)
- "Don't miss out on..." (FOMO framing)
- Any copy that implies the user is doing it wrong by not installing
- Multiple sequential prompts in one session

## Out of scope for v1

- Custom install illustrations beyond the basic share-icon arrow. Use system-style icons.
- Animated tutorials. Static is fine for v1.
- Desktop install prompts. Onduler is mobile-first; desktop install is a future surface.
- A/B testing copy variants. Ship one version, iterate from tester feedback.
- Push notification permission requests bundled into the same flow. Notifications are a separate surface and don't exist yet.
- Detecting in-app browsers (Instagram, Twitter) where install is blocked. Edge case; defer.

## Open questions

- Should the onboarding install step show even for desktop signups (with a "you'll see this on mobile" hint), or hide entirely on desktop? Recommendation: hide entirely, since the user might be desktop-only and the prompt would be noise.
- Should Layer 2 also appear for users on browsers where install isn't supported (Firefox iOS, in-app browsers)? Recommendation: no, hide for unsupported browsers since the tile would be a dead-end CTA.
- Does dismissing the Layer 2 tile show a toast confirmation, or silent dismiss? Recommendation: silent. Toast is overkill for "I hid a tile."

## File touch list (anticipated)

- `app/onboarding/` — add a new install step, probably between Personalize and the final route to `/dashboard`. May require new step component + integration with existing onboarding step state.
- `app/dashboard/components/DashboardView.tsx` — add the bottom tile, gated by detection helpers.
- `app/welcome/page.tsx` — make the existing tutorial reusable as a component (`InstallInstructions`) so the onboarding step and the dashboard tile sheet can both render it. The page route stays for the Settings link target.
- `lib/install.ts` (new) — detection helpers, localStorage state helpers, the `beforeinstallprompt` listener as a custom hook.
- `app/settings/SettingsPanel.tsx` — rename row from "Add to home screen" to "Install Onduler."
- TypeScript types for `BeforeInstallPromptEvent` (not in standard lib).

## Test plan

- New signup on iOS Safari → onboarding ends → install step appears with tutorial → skip → land on dashboard → log 3 motions → tile appears at bottom → tap "Show me how" → tutorial sheet opens → close → tile still there → tap "Not now" → tile gone → 14 days pass (simulated via localStorage edit) → tile reappears.
- New signup on Android Chrome → onboarding ends → install step appears with "Install" button → tap → native prompt appears → accept → returns to dashboard → tile never appears.
- New signup on desktop → onboarding ends → install step skipped → land on dashboard → tile never appears.
- Existing user (already standalone) opens app → no install prompts anywhere.
- User on Firefox iOS (no install support) → onboarding skips install step → no tile on dashboard → Settings row still present (shows "must use Safari" message in tutorial).

## Success criteria

Qualitative, per the v1 exit posture:

- Testers see the onboarding install prompt at least once.
- No tester reports the recurring tile as annoying.
- Increased proportion of testers using Onduler in standalone mode (visible via referrer / display-mode in Sentry breadcrumbs, if instrumented).

## ADR

A short ADR (`docs/decisions/0014-install-flow.md`) should ship with this work since Layer 2 adds a new recurring dashboard chrome element, which is the kind of structural decision the ADR series exists to capture. Layer 1 (onboarding step) is a flow extension and doesn't strictly need an ADR, but folding it into the same ADR keeps the install-flow story together.
