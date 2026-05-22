# Onduler — Launch plan

*Status: working doc. Last updated 2026-05-22.*

This doc is how Onduler moves from solo testing to a first wave of 5–10 engaged beta users without breaking the product's own posture. Distribution strategy, channel playbook, copy primitives, and the timeline that gets us from here to "we have real users." PROJECT.md is still the product spec; this is the distribution spec.

## The frame: a secret club, on purpose

Onduler's product voice — locked-page mystery, vibe-only silhouettes, "not all those who wander are lost" — is also the brand's distribution voice. The marketing IS the product extended outward. Loud acquisition tactics (paid ads, Product Hunt blasts, mass DMs) would contradict the posture and filter for the wrong users. Quiet acquisition (a mysterious image, DM-gated invites, postcards in the right physical spaces, personal asks to specific people) filters for the users who already lean toward intentionality — which is the audience.

This means low volume, high signal, slow growth. Target for the first month: 5–10 deeply engaged testers. Not 50, not 100. The bar is qualitative — did testers complete a full cycle, drop an anchor, and surface feedback we didn't already know?

## Target audience

Profile of the early Onduler user:

- 25–45, white-collar or creative
- Has tried Streaks, Habitica, Notion templates, Productive — found them either guilt-tripping or sterile
- Comfortable with metaphor (you have to be okay calling something a "swell")
- Skeptical of hustle culture; not optimizing for productivity, optimizing for balance
- Probably meditates, journals, has been in therapy, ADHD-adjacent or neurodivergent
- Often: surfers, climbers, runners, creative pros

Where they cluster physically (Berkeley/SF):

- Climbing: Touchstone gyms — Berkeley Ironworks (local backyard), Great Western Power Co. (Oakland), Dogpatch Boulders (SF), Mission Cliffs (SF)
- Surf: Mollusk Surf Shop (SF) — strongest vibe match in the Bay
- Sailing: weaker fit (older, more establishment audience); deprioritized
- Coffee/community bulletin boards: Local 123 (Berkeley), Hearth Coffee, Sightglass

Where they cluster online:

- Reddit: r/getdisciplined, r/ADHD, r/decidingtobebetter, r/surfing (literally — the metaphor lands)
- Twitter / Bluesky: #buildinpublic, design-Twitter, indie-hacker-Twitter
- Substack: Cal Newport and Oliver Burkeman readers (adjacent, not direct)

Explicitly *not* the audience: r/productivity, r/getmotivated, hustle-culture-adjacent communities. Too saturated, too cynical, wrong voice fit.

## Copy primitives

**Primary tagline: "Every motion leaves a wake."**
Used on the landing page (above the email field), on postcards (back side), and as the line that defines the brand voice externally. Carries the doctrine that every motion matters. Teaches the cause-and-effect of the wake visual.

**Visual-paired caption: "Show me your wake."**
Used only when the wake visual is directly present — Instagram post caption, landing-page hero pairing, postcard back. The exposure/vulnerability of the question is the point when the image gives it context. Never standalone — without the image it just reads vulnerable without payoff.

**Welcome-back line (in-app): "Every motion has an impact."**
Used at the wave/return welcome-back screen, paired with the fresh circle that begins the new wake. Mirror of the tagline in warmer phrasing for the moment of return.

**Italic closer (optional): "Not all those who wander are lost."**
Tolkien. Already in product on the locked Anchors page. Can extend to postcard back or landing-page footer.

**Avoided:** "What's in your wake?" — too close to the Capital One "What's in your wallet?" cadence. Identical stress pattern, identical syllable count, runs subconsciously into the ad campaign that's been live since 2000.

## Visual primitives

**The wake (live data, in product).**
Shape derived from the user's actual logs over the cycle window. Monochrome white stroke on the deep-ocean ground, breathing animation, no swell colors, no target overlay. Builds from a blank pulsing circle as the user logs — every motion has an impact, the visual is always responsive to action. Live on the locked Anchors page (all four cadences: week / month / quarter / year), with each cadence's wake drawing from its own window. Wave mode: hidden, but reappears the moment the user logs within the wave; on welcome-back, resets to a fresh pulsing circle.

**The marketing wake (seeded random).**
For postcards, Instagram, landing page — anywhere there's no real user data yet. Generator produces a plausible wake with random N (3–10) and randomized actuals. Each printed postcard could carry a different seed, so the stack of postcards is itself a quiet display of uniqueness. Marketing-side asset only; the in-app rendering is always live.

**WaveField (layered ocean canvas).**
24 waves in 8 depth layers, scattered speeds, halo strokes. Already shipped on the locked Anchors page; extends in the same session to the month/quarter/year locked tiles and to the landing-page hero.

**Typography for marketing surfaces.**
Manrope for headers and the URL. IBM Plex Mono italic for the Tolkien line or other quiet inset copy. Matches the product so the moment a tester scans the QR and lands on the page, the visual identity is continuous — they don't feel handed off from a marketing site to "the actual app."

## Pre-tester checklist

These ship before any invite goes out. Without them, testers hit avoidable friction and feedback gets muddy.

1. **Haptics honesty.** Settings → Haptic toggle gains a "Not supported on this device" hint when `navigator.vibrate` is missing. The toggle stops lying on iPhone PWA.
2. **In-app feedback affordance.** "Send feedback" row in Settings; opens a `mailto:` link or a Tally form. One-tap, explicit, easy to find.
3. **Install instructions page.** A `/welcome` or `/install` route with PWA install instructions for iOS (Safari → share → add to home screen) and Android (tap install banner). Screenshots inline. First thing a tester sees after clicking through from the landing page.
4. **Error monitoring.** Wire Sentry (or Vercel's built-in equivalent) so server / client crashes surface before testers tell us. The current `/admin` shows shapes and counts, not crashes.
5. **The wake.** ADR 0010 ships — live actuals-only polygon on the locked Anchors page across all four cadences, blank pulsing circle as the empty state, coalesce-from-circle animation as the user logs, wave-mode hide/reappear, fresh circle on welcome-back. This is the hero feature that makes the secret-club aesthetic legible.
6. **Build deflation.** ADR 0004 amendment — drop user-facing "shape," surface becomes "Starter sets," drop secondary slot from UI, reword welcome-back copy from "Pick up your [shape]" to "Pick up where you left off."
7. **Landing page at onduler.app.** One-page vibe-first hero: breathing wake, primary tagline, paragraph in product voice, email field labeled "Request an invite." No screenshots gallery, no feature list, no testimonials.

## Distribution channels

### Personal DMs (highest conversion, lowest reach)

20 specific friends, hand-picked from the existing ~1k Instagram followers. Selection criteria: would actually use the product, not just be polite about it. Skews toward law-school friends going through post-graduation identity questions, college friends who've talked about meditation or journaling or balance, Bay-area friends who've quietly moved toward intentional living.

Format: a personal DM, no screenshot attached, no link. *"Hey — built a thing. Small beta, want in?"* The personal ask converts at 30–50%; a public broadcast post would convert at 1–3%. Both have a place, but this is where the first 10 testers actually come from.

Target: 8–12 yeses out of 20.

### Instagram (medium conversion, compounding reach)

ONE post, one story 24 hours later, then silence for a week. Don't overpost — the silence does work.

- **Post:** a still of the wake (or a slow loop of the breathing version if reels-style works at small scale). Caption is one line: *"Every motion leaves a wake. DM if you want in."* No app name in the image. No link in the caption — DM-gated entirely.
- **Story:** 24 hours later, slightly different framing of the same visual. Same prompt: *"Still building. DM."*
- Then quiet. People who saw it will ask their friends, which is the actual goal.

Target: 5–10 DMs over the first week of the post.

### Postcards (medium conversion, physical-anchor reach)

30–50 postcards printed via Moo (or a Berkeley local print shop). Cost: ~$40–60.

**Design brief:**

- 4×6 or 5×7, heavy matte stock
- Front: a wake (different seeded random shape per print) on a deep-ocean ground with the WaveField wash. No headline, no tagline, no logo. Just the shape.
- Back: *"Every motion leaves a wake."* in modest Manrope type. Below: *onduler.app* + small QR code. Optional italic bottom line: *"Not all those who wander are lost."*
- Typography matches the product (Manrope for the name/URL, IBM Plex Mono italic for the Tolkien line)
- No "join the waitlist," no "the next great habit app," no marketing voice — restraint is the whole point

**Drop locations (one weekend afternoon of driving):**

- Berkeley Ironworks (Touchstone) — local backyard, can refresh weekly
- Mollusk Surf Shop (SF) — strongest single vibe match
- Great Western Power Co. (Oakland), Dogpatch Boulders (SF) — other Touchstones
- Local 123, Hearth Coffee, Sightglass — bulletin-board coffee shops in the right neighborhoods

Target: 3–8 QR scans turning into landing-page visits per week of placement. Track via a UTM parameter on the QR code so postcard conversions are distinguishable from Instagram conversions.

### Landing page at onduler.app (the conversion surface)

Built inside the existing Next app (push the dashboard to `/dashboard` or `/app`). One page, no scroll-to-features marathon.

- **Hero:** wake visual (breathing) + primary tagline + 100-word paragraph in product voice
- **The paragraph:** wave/tide framing, what makes Onduler different (guilt vs joy, waves vs streaks). Not a feature list. Voice over information.
- **Email capture:** field labeled "Request an invite" + optional one-line question ("What habit app frustrated you most?") to filter for users who have an actual point of view
- **Footer:** one sentence about who Josh is
- **No:** screenshots gallery, feature list, testimonials, "Coming soon," pricing teasers, social-proof badges

### Build-in-public on Twitter or Bluesky (long-tail, optional)

Start a thread now even with zero followers. Post screenshots and decisions weekly — the Anchors rename story, the wake decision, the build deflation. Tag `#buildinpublic`. Cost is low — Josh is already writing decisions into PROJECT.md, so this is paraphrase-and-post.

Audience grows by the time it actually matters (App Store launch, Product Hunt). Skip entirely if maintaining it feels like a chore — it's a multiplier, not a foundation.

### Community drops (optional, one shot per community)

If interest emerges, pick ONE subreddit or Discord where you genuinely belong. Post once, honestly: *"I built a habit tracker because every other one made me feel watched. Looking for 10 beta testers."* Pitch the problem, not the app.

Candidates: r/getdisciplined, r/decidingtobebetter, r/surfing. Don't try to be in all of them — one drop, see who replies.

## Timeline

**Session 1: pre-tester checklist (1–2 days work).**
Haptics honesty, in-app feedback affordance, install instructions page, Sentry wiring.

**Session 2: the wake + build deflation (3–5 days work).**
ADR 0010 (wake), ADR 0004 amendment (build deflation), PROJECT.md updates. Code: `getActualPolygon(userId, window)` helper, new `Wake` component, coalesce-from-circle animation, locked-page wiring across all four cadences, WaveField extension to the month/quarter/year locked tiles, wave-mode hide/reappear behavior, welcome-back fresh-circle, copy reworks.

**Session 3: marketing wake + landing page (1–2 days work).**
Seeded random wake generator (`generateRandomWake(seed, n)` server-side, exportable as a standalone SVG for postcard print). Landing page at onduler.app with hero wake breathing, primary tagline, paragraph, email field, Supabase table for waitlist captures.

**Off-session work (parallel, ~2–3 hours total):**
Design postcard, order 30–50 from Moo (~5 days to arrive). Pick 20 friends from Instagram followers; draft personal DM template.

**Week of launch (after sessions 1–3 ship and postcards arrive):**

- **Day 1 (Saturday):** Drop postcards across the four Touchstone gyms + Mollusk + 2–3 coffee shops. One afternoon of driving.
- **Day 1 evening:** Send the 20 personal DMs.
- **Day 3:** Post the Instagram + story.
- **Day 4 onward:** Watch `/admin` daily, respond to invite requests within 24 hours, do a personal hello call or coffee with each of the first 5 testers.

## What we are explicitly NOT doing yet

- **TestFlight / native iOS app.** PWA install is fine at this scale. The Capacitor wrapper goes in when we're going to App Store launch and need install-funnel data, not before.
- **Product Hunt.** One-shot launch channel; save it for when the product is proven and testers' feedback is baked in.
- **Paid ads.** Wrong posture. Contradicts the secret-club aesthetic at the brand level.
- **Reddit posts in r/productivity, r/getmotivated, etc.** Too saturated, too cynical, wrong voice fit.
- **Press / Hacker News.** Premature.
- **Caretaker starter set.** Held until naming pre-launch (see PROJECT.md).
- **An Onduler-owned community space (Discord server, subreddit, forum, Circle, etc.).** Deliberate silence. Many great products have no community space, and the current owner is not the right person to spearhead one. This is an intentional choice, not a deferral — revisit only if there's a clear user-driven reason. Posting once in *existing* communities (the community-drops channel above) is a separate decision and remains in scope.

## Phase 2 triggers (when to escalate)

Move from secret-club to wider distribution when:

- 10+ engaged testers giving qualitative feedback for 3+ weeks
- Waitlist exceeds 50 names on the landing page
- Stripe / monetization shipped (need a business model before scaling)
- TestFlight wrapper built and reviewed (need a cleaner install funnel before App Store)

When those conditions land, the playbook shifts to Product Hunt + a more public launch post + a press kit. That's a different doc — `docs/launch-plan-v2.md` when we get there.

## Metrics

This stage is qualitative, not quantitative. Conversion rate is the wrong frame. The signal is: *did testers complete a full cycle, drop an anchor, and tell you something you didn't already know?*

Daily/weekly to watch:

- `/admin` user count (and new signups)
- Email captures on the landing page
- DMs received via Instagram
- Postcard QR scans (via UTM-tagged short URL)
- Conversations actually had with testers (informal — coffee, phone, DM threads)

After 30 days:

- Number of testers who completed at least one weekly ceremony
- Number of unique pieces of qualitative feedback received
- Any product-changing insights surfaced (the Anchors rename from May 2026 is the template — that's what good feedback looks like and is what we're listening for)

---

*This doc is the working contract for how Onduler reaches its first 10 users. Update as decisions land or channels change. If a channel underperforms or a copy line shifts, edit in place rather than appending — this is a living plan, not an archive.*
