# Handoff: Onduler Design System v1

## Overview

Onduler's first complete design system. Covers semantic tokens for three themes (Default, Bolinas, Biarritz) across light and dark modes, the type pair (Courier Prime display + Manrope body + Manrope italic for emphasis), every component primitive (paper-list Motion row, tide bar, Swell row, constellation, Reflections radar, bottom nav, celebration, wave wash, locked page, cycle-close ceremony, skip affordance, add-entry pattern), the motion specs, voice & copy rules, the bottom-nav icon set, and anti-patterns.

This is the source of truth that future Onduler screen prototypes will be built against.

## About the design files

Everything in `reference/` is **HTML/JSX prototypes** rendering the design system as a single scrollable doc. **They are references, not production code.** Open `Onduler Design System.html` in a browser to see the full system rendered, with live components, interactive radar, replayable celebration, theme toggles, and phone-frame demo screens.

The task is to **recreate the design choices in the existing Onduler codebase** at `onduler/` — Next.js (App Router) + TypeScript + Tailwind + Supabase, per `PROJECT.md`. Apply the system surgically against the existing components; never ship the HTML or JSX from this bundle directly.

The internal/external vocabulary split in `PROJECT.md` continues to apply — surface copy uses Tide / Wave / Swell / Motion / Waypoint; internal code names can keep their existing identifiers (`milestones`, `build`, etc.).

## Fidelity

**High-fidelity.** Exact hex values, exact letter-spacing, exact stroke widths, exact animation timings, exact icon SVGs. Implementations should match the reference doc pixel-for-pixel within the codebase's existing styling system.

---

## Implementation tasks

In rough order — start with tokens & type because every visual change cascades from them.

### 1. Tokens — `app/globals.css`

Replace the three theme blocks (`:root`, `[data-theme="bolinas"]`, `[data-theme="biarritz"]`, plus their `prefers-color-scheme: dark` mirrors) with the refined token sets below. Token names already in use in the codebase (`--th-bg`, `--th-surface`, `--th-text`, etc.) stay; their values change. **New semantic tokens** to add: `--th-surface-2`, `--th-border-soft`, `--th-success`, `--th-wave-wash`, and `--th-swell-1` through `--th-swell-10`.

Full token values are in `reference/tokens.css` (search for the `[data-theme=…][data-mode=…]` blocks — drop the `-mode` suffix since the codebase uses `prefers-color-scheme` instead of a data attribute, and rename `--bg` → `--th-bg` etc. to match the existing convention).

#### Default — deep ocean

**Light:**
```css
--th-bg:           #f4f7fa;
--th-surface:      #e9eef3;
--th-surface-2:    #dee5ec;
--th-text:         #0e2238;
--th-secondary:    #355068;
--th-muted:        #6b7f93;
--th-faint:        #a4b1bd;
--th-border:       #d4dde5;
--th-border-soft:  #e3eaf0;
--th-btn:          #0e2238;
--th-btn-text:     #f4f7fa;
--th-btn-hover:    #355068;
--th-focus:        #6b7f93;
--th-accent:       #2772bd;
--th-accent-text:  #ffffff;
--th-success:      #2f7d6b;
--th-wave-wash:    rgba(39, 114, 189, 0.08);
```

**Dark:**
```css
--th-bg:           #0b1a2c;
--th-surface:      #14263b;
--th-surface-2:    #1c324a;
--th-text:         #e8eef5;
--th-secondary:    #b8c5d3;
--th-muted:        #7d8fa3;
--th-faint:        #4d5e72;
--th-border:       #213c58;
--th-border-soft:  #182b41;
--th-btn:          #e8eef5;
--th-btn-text:     #0b1a2c;
--th-btn-hover:    #b8c5d3;
--th-focus:        #7d8fa3;
--th-accent:       #4d97e0;
--th-accent-text:  #0b1a2c;
--th-success:      #4eb09a;
--th-wave-wash:    rgba(77, 151, 224, 0.12);
```

#### Bolinas — northern California fog

**Light:**
```css
--th-bg:           #ebede7;
--th-surface:      #dfe1da;
--th-surface-2:    #d2d4cc;
--th-text:         #1f2520;
--th-secondary:    #475048;
--th-muted:        #758078;
--th-faint:        #a7b1aa;
--th-border:       #cdd1ca;
--th-border-soft:  #dde0d8;
--th-btn:          #1f2520;
--th-btn-text:     #ebede7;
--th-btn-hover:    #475048;
--th-focus:        #758078;
--th-accent:       #5b7359;
--th-accent-text:  #ffffff;
--th-success:      #6d8a64;
--th-wave-wash:    rgba(91, 115, 89, 0.08);
```

**Dark:**
```css
--th-bg:           #161a17;
--th-surface:      #1f2420;
--th-surface-2:    #2a302a;
--th-text:         #e0e3da;
--th-secondary:    #b4bdb1;
--th-muted:        #818c81;
--th-faint:        #4c544e;
--th-border:       #2c3530;
--th-border-soft:  #222824;
--th-btn:          #e0e3da;
--th-btn-text:     #161a17;
--th-btn-hover:    #b4bdb1;
--th-focus:        #818c81;
--th-accent:       #93b18b;
--th-accent-text:  #161a17;
--th-success:      #93b18b;
--th-wave-wash:    rgba(147, 177, 139, 0.10);
```

#### Biarritz — Atlantic surf town

**Light:**
```css
--th-bg:           #f5efe5;
--th-surface:      #ebe3d4;
--th-surface-2:    #dfd5c1;
--th-text:         #112730;
--th-secondary:    #2c5560;
--th-muted:        #6b8088;
--th-faint:        #a8b4b9;
--th-border:       #d6c9b3;
--th-border-soft:  #e4dac6;
--th-btn:          #112730;
--th-btn-text:     #f5efe5;
--th-btn-hover:    #2c5560;
--th-focus:        #6b8088;
--th-accent:       #c9521e;
--th-accent-text:  #ffffff;
--th-success:      #2a6f7a;
--th-wave-wash:    rgba(42, 111, 122, 0.08);
```

**Dark:**
```css
--th-bg:           #0e2329;
--th-surface:      #15303a;
--th-surface-2:    #1e404c;
--th-text:         #ede5d4;
--th-secondary:    #c4b8a0;
--th-muted:        #8a8576;
--th-faint:        #4e5552;
--th-border:       #244a56;
--th-border-soft:  #1a3742;
--th-btn:          #ede5d4;
--th-btn-text:     #0e2329;
--th-btn-hover:    #c4b8a0;
--th-focus:        #8a8576;
--th-accent:       #de7140;
--th-accent-text:  #0e2329;
--th-success:      #7ec5cd;
--th-wave-wash:    rgba(222, 113, 64, 0.12);
```

Also register the new tokens in the `@theme inline` block so Tailwind can use them: `--color-th-surface-2`, `--color-th-border-soft`, `--color-th-accent`, `--color-th-accent-text`, `--color-th-success`, `--color-th-wave-wash`.

### 2. Swell palettes — `lib/theme-colors.ts`

Replace `THEME_PALETTES` with the new 10-color sets. **Each theme has separate light and dark palettes** — the existing single-palette structure should expand to `{ light: string[], dark: string[] }` per theme. Update `getShuffledThemePalette` to accept the active mode.

```ts
export const THEME_PALETTES: Record<ThemeName, { light: string[], dark: string[] }> = {
  default: {
    light: ['#2A6FDB','#1FA38C','#E2785A','#D9A93E','#5B9B6D','#C45577','#6BACE0','#6FCDB7','#8E6CB7','#6E879F'],
    dark:  ['#5A95E8','#34BFA8','#ED8F73','#E3BB5C','#7BB78A','#D87693','#91C5EE','#8DDDC7','#AB8AD0','#93A6BB'],
  },
  bolinas: {
    light: ['#6F8A6E','#8FA8AF','#B89E7E','#9CAB8E','#B58F8A','#5C7886','#A89F95','#7C9088','#C0AE93','#607566'],
    dark:  ['#97AC92','#A5C0C6','#C9AE92','#B5C29F','#C6A29D','#87A1AE','#B5ACA2','#94A89F','#D0BEA4','#84997F'],
  },
  biarritz: {
    light: ['#C9621E','#2A6F7A','#D6A968','#B04E3C','#6B98B5','#D89066','#8AA570','#9C5B3B','#4D8489','#C28C5C'],
    dark:  ['#DE7B47','#4FA6B3','#E2BC85','#D26C5C','#8ABACF','#E5A582','#A8BE91','#C07A5B','#72ADB3','#D7A879'],
  },
};
```

`getRandomThemeAccent` and the ring-buffer logic stay; just pass mode through.

### 3. Fonts — `app/layout.tsx`

Replace Geist Sans / Geist Mono with:
- **Courier Prime** (display: 400, 700; italic 400) → `--font-display`
- **Manrope** (300, 400, 500, 600, 700; italic 400, 500) → `--font-sans` (rename existing `--font-geist-sans`)
- Drop the mono pair — Manrope handles UI; Courier handles display.

The existing `--font-sans` references in `globals.css` `@theme inline` stay; just point them at the new font variables.

### 4. Typography rules — `app/globals.css`

Add these to `globals.css` (or wherever global typography lives):

```css
/* All <em> renders in Manrope italic — Courier Prime Italic is just
   slanted upright and looks worse than the typewriter face it sits in. */
em {
  font-family: var(--font-sans);
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.005em;
}

/* Display family (Courier Prime) gets generous tracking. */
.display, h1, h2 {
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

/* Body/UI never goes all-caps with heavy tracking; one exception is
   the 11px section kicker. */
.kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-th-accent);
}

/* Tabular numerals everywhere — stats, target readouts, dates. */
.tnum, .num { font-variant-numeric: tabular-nums; }
body { font-feature-settings: 'ss01', 'tnum'; }
```

### 5. Bottom-nav icons — `app/components/BottomNav.tsx`

Replace the `swells`, `reflections`, `settings` icon SVGs (Motions stays). Exact SVGs:

**Motions (UNCHANGED):**
```jsx
<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" />
  <path d="M8 12.5l3 3 5-6" stroke="currentColor" />
</svg>
```

**Swells — compass (yin-yang needle):**
```jsx
<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="9" stroke="currentColor" />
  <path d="M12 5 L14.2 11.6 L9.8 11.6 Z" fill="currentColor" stroke="currentColor" />
  <path d="M12 19 L14.2 12.4 L9.8 12.4 Z" fill="none" stroke="currentColor" />
</svg>
```

**Reflections — anchor:**
```jsx
<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="4.5" r="1.9" stroke="currentColor" />
  <path d="M12 6.4 V 20" stroke="currentColor" />
  <path d="M8.6 10.5 H 15.4" stroke="currentColor" />
  <path d="M4.6 13.5 C 4.6 17.6, 8.2 20, 12 20 C 15.8 20, 19.4 17.6, 19.4 13.5" stroke="currentColor" />
  <path d="M4.6 13.5 L 6.6 14.7 M 4.6 13.5 L 4.6 15.7" stroke="currentColor" />
  <path d="M19.4 13.5 L 17.4 14.7 M 19.4 13.5 L 19.4 15.7" stroke="currentColor" />
</svg>
```

**Settings — sliders:**
```jsx
<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  <path d="M3 8h9 M17 8h4" stroke="currentColor" />
  <circle cx="14.5" cy="8" r="2.25" fill="var(--color-th-bg)" stroke="currentColor" />
  <path d="M3 16h4 M12 16h9" stroke="currentColor" />
  <circle cx="9.5" cy="16" r="2.25" fill="var(--color-th-bg)" stroke="currentColor" />
</svg>
```

All four use **1.75 stroke, round caps, round joins, 24×24 viewBox, 20px (h-5 w-5) rendered size**. The pending-ceremony tide-pulse animation on the Reflections tab stays as-is.

### 6. SwellRadar slice-bleed fix — `app/components/SwellRadar.tsx`

This is a real bug, not just a polish. When a Swell with a large actual sits next to a Swell with a small target, the slice extends past the neighbor's bisector boundary into the neighbor's wedge. The fix: clamp the slice's chord ends to the wedge boundary radii, not to the slice's own radial extent.

Replace the `slicePath` (or whatever the equivalent helper in `lib/radar.ts` is called) with the logic from `reference/components.jsx` → `slicePath` inside `ReflectionsRadar`:

```js
const slicePath = (i) => {
  if (!actuals[i]) return null;
  const a = axisAngle(i);
  const targetR = (Math.min(targets[i], maxTarget) / maxTarget) * R;
  const actualR = (Math.min(actuals[i], maxTarget) / maxTarget) * R;
  const fillR = Math.min(actualR, targetR);
  if (fillR < 4) return null;
  // Critical: chord ends MUST clamp to the wedge boundary radii. Without
  // this, a tall slice next to a short neighbor visually leaks into the
  // neighbor's territory at the chord intersection.
  const leftBoundary  = wedgeBoundary((i - 1 + N) % N);
  const rightBoundary = wedgeBoundary(i);
  const leftBoundaryR  = Math.hypot(leftBoundary.x  - cx, leftBoundary.y  - cy);
  const rightBoundaryR = Math.hypot(rightBoundary.x - cx, rightBoundary.y - cy);
  const halfAngle = Math.PI / N;
  const leftChordR  = Math.min(fillR, leftBoundaryR);
  const rightChordR = Math.min(fillR, rightBoundaryR);
  const va = { x: cx + Math.cos(a) * fillR, y: cy + Math.sin(a) * fillR };
  const b1x = cx + Math.cos(a - halfAngle) * leftChordR;
  const b1y = cy + Math.sin(a - halfAngle) * leftChordR;
  const b2x = cx + Math.cos(a + halfAngle) * rightChordR;
  const b2y = cy + Math.sin(a + halfAngle) * rightChordR;
  return `M ${cx} ${cy} L ${b1x} ${b1y} L ${va.x} ${va.y} L ${b2x} ${b2y} Z`;
};
```

`wedgeBoundary`, `axisAngle`, `vertex`, `wedgePath`, `R`, `N`, `cx`, `cy`, `maxTarget` already exist in `lib/radar.ts` — no changes to them needed.

### 7. Locked Reflections page — `app/reflections/page.tsx` (or wherever `LockedPage` lives)

When `!unlocks.week`, render the new locked page. Replace the SVG drifting tide lines with a **canvas-based wave field** drawn back-to-front, plus an **irregular 7-vertex radar silhouette** floating in front.

The reference is in `reference/components.jsx` → `WaveField` + `LockedPage`. Key properties:

- Canvas reads `--th-bg` and `--th-text` from the parent's computed style. Uses devicePixelRatio for crisp rendering. Re-fits on ResizeObserver.
- 8 stacked sine waves with varying `yBase` (0.18 → 0.98), `amplitude` (6 → 20), `frequency` (0.018 → 0.028), `speed` (0.0025 → 0.0050), `phase` (random 0.2 → 3.0), `width` (0.9 → 2.6), `opacity` (0.10 → 0.46).
- Each wave: stroke the sine path in `--th-text`, then fill `[wave-path, bottom-right, bottom-left]` polygon with `--th-bg` to mask waves drawn earlier.
- Add a gentle second harmonic (`amplitude * 0.18 * sin(angle*2 + 1.3)`) so peaks don't all line up.
- Animate via `requestAnimationFrame`, increment `t` by 1 per frame.
- Clean up: `cancelAnimationFrame`, `ResizeObserver.disconnect` on unmount.

The 7-vertex silhouette uses radii `[0.92, 0.62, 0.78, 0.55, 0.88, 0.7, 0.5]` at axes `(i / 7) * 2π - π/2`. Render twice: once blurred (`filter: blur(7px)`, `opacity: 0.7`) for the wash, once sharp (`opacity: 0.55`) with spoke radials for the structure. The sharp layer breathes at `slow-breathe 4s ease-in-out infinite` (0.85 → 1.0 → 0.85 opacity).

Copy: "Glimpses of where you've been. Come back as you log." in Courier Prime 20px, line-height 1.55, letter-spacing 0.04em, `--th-secondary`. Cadence label below ("weekly") in Manrope 12px, lowercased, `--th-faint`.

### 8. Motion specs

Existing animations in `globals.css` stay. Add/verify these are present and tuned:

| Animation | Duration | Easing | Where |
|---|---|---|---|
| `tide-rise` (width 0 → target) | 800ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Tide bar fill |
| `celebration-wave` (scale 0 → 8, opacity 0.55 → 0) | 1800ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Existing — keep |
| `celebration-foam` (scale 0.4 → 2.6, opacity 0 → 0.85 → 0) | 1100ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Existing — keep |
| `celebration-droplet` (translate 0 → polar) | 1200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 10 droplets, staggered 30ms each |
| `nav-tide-pulse` | 2400ms | `ease-in-out` infinite | Existing — keep |
| `tide-drift` | 18s | `ease-in-out` infinite | Now superseded by the canvas wave-field; safe to keep for fallback |
| `wash-fade-in` | 700ms | `ease-out` | Wave-mode wash on the radar |
| `slow-breathe` (opacity 0.85 → 1.0 → 0.85) | 4s | `ease-in-out` infinite | Locked page silhouette |
| `check-in` (scale 0.3 → 1.0, opacity 0 → 1) | 240ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Motion row checkbox |
| Press feedback | 120ms | `ease` | Scale 1.0 → 0.96 on pointerdown for every nav tap + Motion row |

### 9. Voice & copy

Reference: section 9 in `Onduler Design System.html`. Apply across the codebase wherever empty states, ceremony prompts, or onboarding copy live. Key rules:

- **Mirror principle in empty states.** Reflect what the user has done, never demand what they haven't.
- **Banned words.** `tasks`, `activities`, `goals`, `domains` — anywhere user-facing.
- **No streaks.** No "you haven't done X in N days" copy. No reset-to-zero counters.
- **No red.** No red badges, red counters, red error states for "missed" anything. (Standard form-validation red on actual invalid input is fine.)
- **Skip is always a door.** Visible on every ceremony step, every guided prompt. Same treatment everywhere: 14px Manrope, `--th-muted`, underlined with `--th-faint` decoration color, 4px underline offset.
- **Italic emphasis goes through Manrope automatically** (per the `em` rule in §4). Use `<em>` for ceremony prompts, the celebration line, and any time the voice "softens."

### 10. Anti-patterns

The full crossed-out gallery is in section 11 of the design system HTML. Treat each as a hard-stop. The most likely places these slip in: notification copy, settings descriptions, onboarding flow text, error states.

---

## Design tokens — at a glance

| Token | Default light | Default dark | Bolinas light | Bolinas dark | Biarritz light | Biarritz dark |
|---|---|---|---|---|---|---|
| `--th-bg` | `#f4f7fa` | `#0b1a2c` | `#ebede7` | `#161a17` | `#f5efe5` | `#0e2329` |
| `--th-text` | `#0e2238` | `#e8eef5` | `#1f2520` | `#e0e3da` | `#112730` | `#ede5d4` |
| `--th-accent` | `#2772bd` | `#4d97e0` | `#5b7359` | `#93b18b` | `#c9521e` | `#de7140` |

(Full tables in §1 above and in `reference/tokens.css`.)

### Type

- Display: **Courier Prime** 400 / Italic 400 / Bold 700. Tracking `+0.05em` at every size. Headlines run up to 68px.
- Body: **Manrope** 400 / 500 / 600 / 700, Italic 400 / 500. Tracking `-0.005em` on italic. Tabular numerals globally.
- All `<em>` overrides to Manrope italic regardless of the surrounding family.

### Spacing & radius

- Motion row vertical padding: **14px 18px** (dense: 11px 16px). Hairline rule via absolutely-positioned 1px span at `bottom: 0, left: 18px, right: 18px`. **No card chrome on list rows.**
- Bottom nav: **8px 8px 10px** padding; tab buttons 8px 16px, 10px radius.
- Tide bar height: **3px** on Swell rows / proficiency view. **4px** on daily progress.
- Border radius scale: 5 (keyboard keys) / 7 (checkbox) / 8 (chips, sample tiles) / 10 (theme cards) / 12 (CTAs, sheets) / 14 (SpecCards) / 16 (welcome-back cards) / 999 (pills).

### Sizing rules

- Minimum text size: **14px** on Motion list, **17px** preferred (the row's primary label).
- Hit targets: **44px minimum**; Motion rows hit ~56px.
- Phone frame design width: **320px**; canvas content rendered at devicePixelRatio.

---

## Verification checklist (for Claude Coworker)

After Claude Code lands the changes on a branch, run this list against the reference (`reference/Onduler Design System.html`):

1. **Tokens.** Visually compare each theme × mode against the corresponding swatch grid in section 4 of the reference doc. All 9 semantic tokens and all 10 Swell colors should match exactly. Flag any mismatched hex.
2. **Fonts.** Confirm `font-family` chains land on Courier Prime for display and Manrope for body. The `em` rule should resolve to Manrope italic, not Courier italic — easiest check: open the Voice section of the reference and the equivalent in the codebase; the ceremony prompts should match.
3. **Bottom-nav icons.** Diff the four SVGs against §5. Confirm Motions hasn't changed; the other three should be exactly the SVGs above.
4. **Radar slice fix.** Set targets to e.g. `{Movement: 100, Mind: 10}` and log enough Mind to put its actual at 8 and Movement at 95. Confirm Movement's slice no longer visually crosses into Mind's wedge at the bisector. The old bug looked like a triangle leaking past the radial separator.
5. **Locked Reflections page.** Open with `unlocks.week = false` for a test user. Confirm the canvas wave-field renders, animates smoothly at 60fps, and the lower waves visually mask the upper ones at every crossing. Confirm the silhouette is irregular (not a symmetric hexagon) and breathes at 4s. Test all 3 themes × 2 modes — the canvas should pick up the theme tokens automatically.
6. **Italic rule.** Inspect a rendered `<em>` and confirm computed `font-family` resolves to Manrope, not Courier.
7. **Voice.** Grep the diff for banned words (`tasks`, `activities`, `goals`, `domains`) — flag any introduced. Spot-check empty-state copy for the mirror principle.
8. **Motion timing.** Open a Motion row, tap to check it — checkbox should animate in (`check-in` 240ms). Cross a Swell's weekly target — celebration plays (1.8s wave + foam + droplets, no longer than 2.2s total). Skim the radar on Reflections — drag a handle, confirm the live drag pill follows.
9. **Press feedback.** Tap any bottom-nav tab and any Motion row. Should scale to 0.94 / 0.985 instantly on pointerdown — latency must never read as broken.
10. **Anti-patterns.** Spot-check for: red badges, streak counters, "you haven't done X in N days" copy, card-stacks with shadows on the daily list, RPG vocabulary leaking to surface, forced-required text fields without a skip. Any one is a hard stop.

---

## Files in this bundle

```
design_handoff_onduler_v1/
├── README.md                      ← this file
└── reference/
    ├── Onduler Design System.html ← open in a browser to see everything
    ├── tokens.css                 ← all tokens + animations
    ├── components.jsx             ← every primitive + the WaveField
    ├── screens.jsx                ← phone-frame screens
    ├── app-part-a.jsx             ← cover, vocab, type sections
    ├── app-part-b.jsx             ← color + primitives sections
    ├── app-part-c.jsx             ← surfaces, screens, motion, voice, icons, anti-patterns
    └── app.jsx                    ← root composition
```

The HTML doc is the canonical reference. The JSX files are useful for direct line-by-line lookup of how a primitive is built. Both should be treated as **references** — never copy them into the codebase verbatim.

## Working agreements

From `PROJECT.md`:
- Surgical edits over full rewrites. A prior rewrite reverted visual design — permanent lesson.
- Apply the vocabulary in `PROJECT.md` consistently. Internal/external split holds: code says `milestones` and `build`; users see `Waypoint` and `shape`.
- Count-based pluralization in all UI strings.
- Ceil display rule: points whole, hours to 0.25hr. Polygon geometry runs on unrounded floats; only displayed numbers round.
- Single-user one-week-of-data state. No migration ceremony needed for the token / palette swap — the new palettes reseed swell colors as users open the app.
