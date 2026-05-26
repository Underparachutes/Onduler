# Tester recruitment — handoff (2026-05-25)

Two deliverables in this folder:

1. **Postcard** (front + back, 4×6 portrait, print-ready SVG) — for hand-out at surf shops, climbing gyms, anywhere your audience already lives inside a wave/tide rhythm.
2. **Instagram feed post** (1080×1350 portrait SVG) — single image post for today, asking for the first wave of testers.

Both use the same visual language: deep ocean ground (`#0b2330`), layered WaveField wash, the seed-42 wake polygon (same one the landing page renders), Manrope display + IBM Plex Mono body.

## Files

### Recommended (landscape, rounded corners, current direction)

| File | Purpose |
|---|---|
| `postcard-landscape-front.svg` | Front — full lock-screen wave field, wake centered with QR inset inside, tiny ONDULER wordmark top-left, rounded corners |
| `postcard-landscape-back.svg` | Back — paragraph copy explaining the app, URL + tagline at foot, rounded corners |
| `instagram-post-tester.svg` | IG feed post — wake hero, headline, CTA pill |

### Earlier portrait drafts (kept for reference)

| File | Purpose |
|---|---|
| `postcard-front-tester.svg` | 4×6 portrait front draft — wake + headline + body + QR + URL |
| `postcard-back-tester.svg` | 4×6 portrait back draft — first-person invitation copy |

## Print the postcard

1. Open `postcard-front-tester.svg` in Figma / Affinity / Illustrator.
2. Replace the `QR_SLOT` rectangle with a real QR code pointing to:
   ```
   https://onduler.app/signup?utm_source=postcard&utm_campaign=tester
   ```
   Recommended QR generator:
   ```
   https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Fonduler.app%2Fsignup%3Futm_source%3Dpostcard%26utm_campaign%3Dtester&format=svg
   ```
   Drop the resulting SVG into the cream slot (80×80 units), centered at (200, 482).
3. Open `postcard-back-tester.svg`. The handwriting area between y=300 and y=480 is intentionally blank — when you hand a card to someone you can write a personal "Hey {name} —" or skip it entirely.
4. Extend the BG rect ~12 units (0.12 in) past every edge for printer bleed (front only — the back is cream and will bleed cleanly on its own).
5. Export each side as a PDF at 4 × 6 in. Convert text to outlines on export if your printer doesn't have Manrope or IBM Plex Mono installed.
6. Send to Vistaprint (4×6 portrait is a stock SKU) or any local print shop. Moo's stock SKU is 6×4 landscape — if you go to Moo, either rotate 90° or order their 5×7 and trim.

## Post to Instagram today

1. Open `instagram-post-tester.svg` in Figma / Affinity / Illustrator.
2. Export as PNG at exactly 1080 × 1350 px. IG re-compresses to ~1080 wide, so 1× is sufficient.
3. **Update your IG bio link** to:
   ```
   https://onduler.app/signup?utm_source=instagram&utm_campaign=tester
   ```
   The post says "link in bio" — that needs to actually go to signup, not the waitlist landing page.
4. Use the caption below.

### Suggested caption (primary)

> I built Onduler because every habit app I tried treated every week the same.
>
> Real life isn't like that. There are tides — your steady weeks — and there are waves — the weeks when something pulls you under. Grief, illness, a hard season, a new obsession. Onduler holds both, without making you feel bad for either.
>
> First wave of testers opens today. Sign up, give it a week, tell me what's weird.
>
> Link in bio. 🌊

### Alt caption (tighter, more on-brand-quiet)

> First wave of testers
>
> A gentler way to track what you actually do — built for the weeks you show up and the weeks you can't.
>
> Link in bio.

### First comment (drop this right after posting)

> If you want the why before the what: Onduler doesn't shame you for the weeks you can't show up. Rest is part of the rhythm, not a failure. Try it for a week and DM me what feels off — that's the whole job.
>
> #habittracker #habits #softlife #pacing #builder #earlyaccess #betatest

## Verbal pitch for postcard handoffs (~15 seconds)

When you hand a card to someone:

> "Hey, I'm Josh — I built this app called Onduler. It's a habit tracker that doesn't yell at you when you have a bad week. You ride waves, sometimes you can't get out, that's life. I'm looking for testers — would you give it a shot for a week and tell me what's weird?"

That's the whole pitch. If they say yes, hand them a card. If they say maybe, hand them a card. Don't elaborate unprompted — the card does the rest.

## UTM tracking

Both the postcard QR and the IG bio link include `utm_source` + `utm_campaign` so you can see in Supabase (or in your `waitlist` / `auth.users` referrer logs, if you've wired them up) which channel converted. The campaign is `tester` across both; the sources split into `postcard` vs `instagram`. If you do a second IG post, change `utm_content=v2` so you can A/B them.

## Heads-up: landing page vs signup

The current landing page (`/`) drops visitors into the waitlist. The QR and bio link both bypass that and go straight to `/signup`. That matches your "skip the waitlist" call. **But** — if someone hears "onduler.app" verbally and types it in their browser, they'll hit the waitlist. Two options:

- **Leave it.** The waitlist is a soft gate; it doesn't hurt to have it for organic traffic.
- **Temporarily replace the landing CTA with a direct "Sign up" link** until V1 exit criteria (5 testers complete a weekly ceremony) are met. Surgical change in `app/LandingPage.tsx` — swap the email form for a "Create account →" button pointing at `/signup`.

I'd default to *leave it*. The wake/tagline/landing-page experience is part of why people will trust the signup CTA when they get there.

## Anything else worth doing today

In rough priority order:

1. **IG Story version.** Same art, 1080×1920. Stories die in 24h but they're shareable to your story from your friends' accounts, which is how testers actually find this. I can build it next session — same wake, same headline, just resized.
2. **Sticker.** The wake polygon outline at ~3" diameter is a vinyl sticker that surf shops will *actually put on their counter*. Costs ~$0.40 a unit at Stickermule. Lower-effort, higher-retention than a card-stack on a bulletin board.
3. **Pre-write the welcome email.** Whatever Supabase Auth sends new signups right now is generic. A 2-sentence "Hey, you're in — here's how to start" email shipped today would convert more of the people who actually sign up. I can draft this and you can paste it into Supabase Auth → Email Templates.
4. **A real QR file (not a slot).** I can't generate a binary QR PNG cleanly in this environment without a Python package install. If you want, I can write a tiny one-liner script in the repo (`scripts/gen-qr.mjs`) that runs `qrserver.com` for you and saves the SVG — so future postcard variants are one command away.
5. **Track which cards go where.** Print one batch with `utm_content=surf` and another with `utm_content=climb` so you can tell, six weeks from now, which audience converted. Trivial change to the QR URL per batch.

## Open decisions

These are choices I made without checking with you. Yell if any of them are wrong:

- **Headline word.** I went with "First wave of testers" on both the postcard and the IG post. It reads warm + a little exclusive without being cringe. Alternatives I considered and rejected: "Be a tester" (cold), "Help me build Onduler" (begs), "Early access" (generic SaaS).
- **Body voice.** Front of postcard speaks brand-voice ("A gentler way to track what you actually do…"). Back of postcard speaks first-person ("I'm building Onduler…"). I think the split works — the front sells, the back makes it personal. If you want first-person throughout, easy edit.
- **No waitlist mention anywhere.** Per your call. The cards and post both bypass it.
- **Wake rendered as stacked strokes, not filter blur.** The landing page uses a CSS blur filter to give the wake a soft halo. I tried the SVG-filter equivalent on these deliverables and pulled it back — `<filter>` blur effects render inconsistently through print pipelines (Figma → PDF → commercial press) and through Instagram's compression. Three stacked strokes at decreasing width + increasing opacity give the same visual depth with deterministic rendering everywhere.
