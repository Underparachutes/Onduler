# Onduler — State of the Project

*Last updated: May 2026*

## The big picture

**Onduler** is a gamified personal fulfillment app built around points-based habit tracking across life domains. The goal is to bring balance to life by helping you track where you spend your energy. Domain owned: **onduler.app**.

## The core product insight: waves and tides

Most habit apps treat every day like it should look the same. Onduler doesn't. The app recognizes two modes a person can be in, and meets them where they are. Every interaction with Onduler should feel like a celebration of the user showing up — for themselves, for their domains, for their life. This is the bar every design decision gets measured against. If a feature makes the user feel watched, judged, or behind, it doesn't ship, even if it would drive engagement metrics. The competition optimizes for retention through guilt; Onduler optimizes for retention through joy.

- **Waves** = Human energy and capacity cycle. Sometimes a wave is a creative obsession. Sometimes it's a depressive episode that keeps you in bed for a week. Sometimes it's grief, illness, a new baby, a hard season at work. Onduler treats them the same: a wave is whatever's pulling you under right now, and the app's response is to not chase you. We'll be here. Take care of what you need to take care of. When you surface, the tide is gentle — "hey, want to try knitting today?" — and the app meets you wherever you've landed. The product never uses the language of failure, deficit, or falling behind. Showing up at all is honored. Onduler is not a mental health treatment, but it is built with the understanding that most productivity software pretends people are machines, and most people aren't.

- **Tides** = the steady, default rhythm. When you're not on a wave, the app gently helps you direct your energy across domains so nothing atrophies. This is where the gamification lives — points, weighting, balance.

**The app's job** is to read which mode you're in and adapt. This is the differentiator. Duolingo punishes you for missing a day. Onduler asks what you were doing instead — and if you were riding a wave on something else, that's a win.

This framing has implications:

- **No traditional streaks.** Streaks punish wave-riding by treating any day off as failure.

- **The points engine has to be mode-aware.** Wave mode logs activity without scoring against a daily target. Tide mode rewards balanced energy across weighted domains.

- **The transition between modes is itself meaningful.** When someone comes off a wave, the app is there with a gentle schedule — not a lecture about lost streaks.

**Designed for the full spectrum**

Human energy and capacity cycle. Sometimes a wave is a creative obsession. Sometimes it's a depressive episode that keeps you in bed for a week. Sometimes it's grief, illness, a new baby, a hard season at work. Onduler treats them the same: a wave is whatever's pulling you under right now, and the app's response is to not chase you. We'll be here. Take care of what you need to take care of. When you surface, the tide is gentle — "hey, want to try knitting today?" — and the app meets you wherever you've landed. The product never uses the language of failure, deficit, or falling behind. Showing up at all is honored. Onduler is not a mental health treatment, but it is built with the understanding that most productivity software pretends people are machines, and most people aren't.

## Where we are right now

**Phase: Pre-build setup complete. Ready for Session 1 once the dev machine is online.**

A working prototype exists as a vanilla HTML file (`logbook.html`) — single-page, browser-based, with cloud sync via Claude API. This is the "validate I'll actually use it" version. The real app is a from-scratch Next.js build.

## Tech stack (decided)

| Layer | Choice | Why |

|---|---|---|

| Framework | Next.js (App Router) | React-based, deploys cleanly on Vercel, path to React Native later |

| Database / Auth | Supabase | Generous free tier, Postgres under the hood, auth built-in |

| Hosting | Vercel | Tight Next.js integration, free tier, auto-deploy from GitHub |

| Styling | Tailwind CSS | Clean theme-switching, fast iteration |

| Payments (future) | Stripe | Industry standard, only costs when money moves |

| Source control | GitHub | Standard |

## Accounts and services

| Service | Status | Details |

|---|---|---|

| Domain | ✅ Owned | onduler.app via Namecheap (~$13/yr) |

| GitHub | ✅ Created | username: `underparachutes` |

| Supabase | ✅ Created | signed in via GitHub |

| Vercel | ✅ Created | Personal account, signed in via GitHub |

| Stripe | ⏸ Not yet | Set up when monetization is live |

## Product decisions made

1. **Freemium model.** Free with ads, paid removes ads + unlocks premium themes.

2. **Waves and tides as the behavioral model.** The app detects which mode the user is in and adapts. No streaks. No guilt for going deep on one thing.

3. **Themes are personas of surf towns.** The aesthetic system is built around 5–10 real surf towns, each designed for an imaginary person who'd flock there. Each theme has a story: place, person, vibe, palette, typography, texture, cultural signifiers. This avoids the generic-skin trap — themes feel like distinct products that share a backend, not the same app in different colors.

4. **Confirmed towns so far:** Shonan (with Hokusai influence), Tjørnuvík, Biarritz, Bolinas. Six more TBD. Test for inclusion: each town must produce a theme visually and emotionally distinct from every other on the list. Malibu and Bolinas are both California surf, but they're emotionally on different planets — that's the bar.

5. **Customization within guardrails.** Users pick a theme, then have a small number of knobs (accent color, hero element, typography). No drag-and-drop layout editing.

6. **Web-first, native later.** Build the Next.js web app. React code ports to React Native if/when a native app is warranted (~40–60% reuse).

7. **Domain weighting.** Users assign importance to domains; harder/higher-weight activities earn more points (in tide mode).

8. **Spurt-friendly design.** Going deep on one domain for weeks is supported by the wave/tide model, not punished.

## Open questions (defer until they matter)

- The remaining six surf towns

- Specific point math for tide mode (will tune during build, then tune during real usage)

- How the app *detects* wave vs. tide mode — explicit user toggle, behavior-based inference, or both?

- What replaces streaks as a daily-engagement signal

- Mobile-first vs desktop-first design priority

- Whether to ship a PWA before considering native

## Session roadmap (proposed)

| Session | Goal | Outcome |

|---|---|---|

| **1** | Local dev environment + first deploy | Node.js, VS Code, Git installed. Next.js skeleton committed to GitHub, deployed to Vercel. onduler.app shows a "coming soon" page. |

| **2** | Supabase wiring + auth | Users can sign up and log in. Database schema designed. |

| **3** | Core data model + domain CRUD | Users can create/edit domains and activities. |

| **4** | Logging + points engine | The actual daily-log experience. Wave/tide detection logic begins. |

| **5** | First theme system | A flagship surf town theme (likely Shonan or Bolinas) implemented end-to-end, with theme-switching infrastructure in place. |

| **6** | Polish, additional themes, launch prep | App is shareable. |

| **7+** | Stripe, ads, premium gating | Monetization live. |

These are estimates. Real sessions will pivot based on what emerges.

## Working agreements

- Sessions are numbered. Session start = recap + next step. Session end = summary + queue next session.

- The trigger phrase is **"Onduler, go."**

- I'm not a pro dev. Walk through steps explicitly.

- Direct tone, no flattery, push back when I'm wrong.

- Stack is locked unless something genuinely won't work.
