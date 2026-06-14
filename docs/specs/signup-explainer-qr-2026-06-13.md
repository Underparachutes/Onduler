# Signup explainer for QR arrivals (2026-06-13)

## Problem

The tester-recruitment postcards (ordered 2026-05-30) carry a QR that points at:

```
https://onduler.app/signup?utm_source=postcard&utm_campaign=tester&utm_content=<surf|climb>
```

The cards are now distributed on bulletin boards, in shop windows, in books, and in stacks at venues around the Bay Area. On a bulletin board, a passerby scans the QR without ever holding the card, so they never read the back. The QR is the only thing they touch.

Today `/signup` is a bare account form. Its only copy is the heading "Create your account" and the subhead "Start riding your tides." Someone arriving cold from a QR sees a password field and no explanation of what Onduler is or why they would want an account. The back-of-card copy, which exists precisely to answer "what is this," never reaches them.

The cards are already printed. We cannot change the URL the QR encodes. The fix has to live at `/signup`.

## Decision

`/signup` becomes a two-step flow shown to every visitor:

1. **Intro screen** that mirrors the back-of-card copy, so the arrival is explained before any form appears.
2. **Account form** (the existing form, unchanged in function).

Scope: shown to **every** signup visitor, not only postcard arrivals. Rationale: it is the simpler build (no UTM-conditional branching), and anyone who lands directly on `/signup`, by typed URL, shared link, or search, benefits from the same context. The cost is that a visitor who clicked "Get started" from the landing page reads a near-identical pitch twice. See the optional landing-CTA skip below if we want to remove that redundancy later.

Layout: **intro screen first, then form** (one extra tap), rather than stacking the explainer above the form on one scroll. The intro gets the full screen to do its job, and the form stays clean and focused once the user has opted in.

## The intro screen

A single screen, same visual family as the landing page (`app/LandingPage.tsx`), reusing the breathing wake hero so the QR arrival and the marketing surface feel like one thing.

Top to bottom:

- **Wake hero.** The same seeded breathing wake used on the landing page (`generateRandomWake(42, 7, ...)`, blurred wash layer plus the `slow-breathe` outline). Monochrome on the deep-ocean ground per the wake rule. No color coding, no targets, no badges.
- **Tagline.** "Every motion leaves a wake." (the locked primary tagline, same as the landing hero and the postcard front).
- **Explainer copy.** The back-of-card paragraph, lightly adapted to read on screen. Use this copy verbatim:

  > Onduler is a daily tracker for reflection, momentum, and noticing your patterns.
  >
  > Choose the motions you want to track. Connect them to the swells they feed. Watch your wake build over time.
  >
  > Made for people who are curious about what their daily life is actually building.

  (The card back's closing line, "Join the first wave of testers by scanning the front," is dropped. The reader has already scanned. The Continue button replaces it.)

- **Primary CTA: "Get started"** (or "Continue") advances to the account form.
- **Secondary line: "Already have an account? Sign in"** linking to `/login`, so a returning tester who scans the QR is not forced through the form.

The intro screen is informational only. It collects nothing. It never blocks: there is no required field, consistent with the skip-is-a-door rule. The only forward action is opting into the form, and the Sign in escape hatch is always present.

## The form

The existing `/signup` form is unchanged in behavior: email, password, "Create account," the email-sent confirmation state, the "Already have an account? Sign in" line. Heading "Create your account." It now renders as step two rather than the first thing the visitor sees.

The "Start riding your tides" subhead can stay or go. It read oddly as the only context on a cold landing; with the intro screen now carrying the explanation, it is decorative. Recommendation: keep it on the form step, since the intro now does the explaining.

## State and routing

The two steps live within `/signup` as a single client component with a local step state (`'intro' | 'form'`), defaulting to `'intro'`. No new route, no schema change, no server round-trip to advance from intro to form.

UTM parameters must survive the transition. The simplest robust approach: keep both steps on the `/signup` URL and switch via local state, so the query string (`utm_source`, `utm_campaign`, `utm_content`) is never dropped. The `signUp` server action and any analytics read the same params they do today. Do not navigate to a new path between intro and form, which would risk losing the query string.

If we instead want the step reflected in the URL (shareable "skip to form" link, browser-back returning to the intro), use a `?step=form` search param alongside the existing UTM params rather than a separate route, and preserve all existing params when setting it.

## Optional enhancement: skip the intro from the landing page

Because the landing page (`/`) already leads with the same wake hero, tagline, and explainer before its "Get started" link, a landing-page visitor would read the pitch twice (once on `/`, once on the `/signup` intro). If we want to remove that redundancy without changing the QR behavior:

- Point the landing page's "Get started" link at `/signup?step=form` so it lands directly on the form.
- Direct `/signup` arrivals (QR scans, typed URLs, shared links) still default to `step=intro` and get the full explainer.

This is marked optional because it technically means not literally "every `/signup` visitor sees the intro." Every visitor still sees the explainer somewhere: landing-page visitors saw it on `/`, everyone else sees it on the intro. Take it or leave it; the default build (intro for everyone) stands on its own.

## Voice and vocabulary

- No em dashes anywhere in the copy (uses commas, periods, parentheses).
- Surf vocabulary holds: motions, swells, wake. No "tasks," "activities," "goals," "domains."
- Witness, not coach. The copy describes what the app does and shows; it never tells the reader what they should do.
- Tagline and wake usage follow the locked copy primitives and the wake rule (monochrome, breathing, no scaffolding).

## Acquisition source capture (postcard QR vs direct)

Decision (2026-06-13): the surf vs climb split is abandoned. The first hand-distributed run made clear the two batches will not stay in their intended venues (climb cards landed in a surf shop, a bar window, a makerspace, bookstores, a sober center). `utm_content` is ignored from here on. The cards do not need reprinting, we just stop reading the content tag.

The signal worth keeping is coarser and reliable: did this account come from a postcard QR, or from someone arriving directly (typing the URL, a shared link, search)? Capture it at signup and store it on the account. This is in scope for this change, wired now.

**Signal.** The postcard QR carries `utm_source=postcard`. A direct arrival (`onduler.app` then Get started, or a typed `/signup`) carries no `utm_source`. So:

- `utm_source=postcard` present at signup, source = `postcard`
- absent, source = `direct`

Store the raw `utm_source` value rather than a hardcoded postcard/direct flag, so a future channel (a `flyer` run, an `instagram` link) is captured without a schema change. Blank maps to `direct`.

**Storage.** Add `user_settings.signup_source text` (nullable). Written once at account creation, never updated after.

**Capture path.** Server actions do not receive page query params automatically, so the value has to be handed to `signUp` explicitly. Two options:

- Hidden field (simplest): the signup page (client) reads `useSearchParams()`, and includes `utm_source` as a hidden input in the form. `signUp` reads it from formData and writes `signup_source` on the new user's `user_settings` row (defaulting to `direct` when blank). Works because the intro-to-form step uses local state on the same URL and never navigates away, so the param is still present at submit.
- Cookie (more robust): set a short-lived `onduler_src` cookie the moment any UTM-bearing page loads, then read it at signup. Survives the user wandering to `/login` and back, which would drop a hidden field. More code, only worth it if attribution looks lossy.

Recommendation: ship the hidden-field version now. The intro screen keeps the user on the same URL through to submit, so the param is reliably present. Revisit the cookie approach only if the numbers look lossy.

**Reading it back.** Query directly: `select signup_source, count(*) from user_settings group by 1`. An `/admin` row can surface the split later if it earns a glance, not required for v1.

**Edge cases.**

- Returning tester scans the QR and taps Sign in instead of signing up: no new account, nothing recorded. Correct, they were attributed at their original signup.
- Someone scans, leaves, comes back later by typing the URL: recorded as `direct`. Acceptable, this is last-touch within the signup session.
- The optional `?step=form` skip param does not carry `utm_source`, so landing-page Get started traffic stays `direct`. Correct.

## Out of scope / deferred

- No change to the printed cards or the encoded QR URL.
- No surf vs climb measurement. The split is abandoned (see above), `utm_content` is unused.
- No UTM-conditional intro copy. One intro serves every arrival.
- No A/B testing of intro copy for this wave.
- Analytics on intro-to-form drop-off is a future nicety, not required for launch.

## Acceptance

- Scanning a postcard QR lands on a screen that explains what Onduler is before any form field appears.
- The explainer copy matches the back-of-card message.
- Continuing reaches the existing account form with all UTM params intact.
- A returning tester can reach Sign in from the intro without filling the form.
- No em dashes, correct vocabulary, wake rendered monochrome and breathing.
- A signup arriving with `utm_source=postcard` stores `signup_source = 'postcard'`; a signup with no `utm_source` stores `direct`. Verifiable via `select signup_source, count(*) from user_settings group by 1`.
