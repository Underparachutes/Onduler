# Handoff: Onduler — Theme Studio & Ombre Progress Bar

## Overview
The Theme Studio is a configurator that wraps a live iPhone mock of the Onduler
daily-motions screen. The left rail controls theme (Biarritz / Bolinas /
Tjörnuvík), light/dark mode, accent color, and an optional user wallpaper with a
legibility scrim. The phone shows the "Motions" home screen: a header card with
day, points, and a **progress bar**, followed by swell-grouped lists of motions
the user checks off.

The headline interaction in this handoff is the **ombre progress bar**: as motions
are completed, the fill becomes a gradient of the "swell" colors, with each
color's width proportional to the points earned in that swell. It doubles as a
breakdown of where the user's effort is going.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype
showing intended look and behavior, not production code to ship. The task is to
**recreate this design in the target codebase's existing environment** (React,
SwiftUI, etc.) using its established components, tokens, and patterns. If no
environment exists yet, pick the most appropriate framework and implement there.
The `<image-slot>` web component is a prototype convenience for drag-drop
wallpaper; replace it with the platform's native image picker.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all
intended as shown. Recreate pixel-accurately, but source colors from the theme
token tables below rather than hardcoding.

## The Theme System (read this first)
Every visual value is a CSS variable scoped to the phone screen element via two
attributes: `data-theme` (`biarritz` | `bolinas` | `default`) and `data-mode`
(`light` | `dark`). There are **3 themes × 2 modes = 6 token sets**. Switching a
theme/mode just swaps which variable block applies. In a real app, model this as
a theme object keyed by `[theme][mode]`.

Each theme also exposes **10 "swell" colors** (`--swell-1`…`--swell-10`). Swells
are Onduler's life-area categories; each motion section is assigned one swell
index and colors its header, checkboxes, and its slice of the progress bar from
it.

### Token tables
Token names map 1:1 to the CSS custom properties in the HTML. Pull exact hex
values from the `:root[data-theme][data-mode]` blocks at the top of
`Onduler Theme Studio.html` — they are the source of truth. Key roles:

- `--bg`, `--surface`, `--surface-2` — page / card / nested-card backgrounds
- `--text`, `--text-secondary`, `--text-muted`, `--text-faint` — type ramp
- `--border`, `--border-soft` — hairlines
- `--accent`, `--accent-text` — primary accent + its readable foreground
- `--swell-1` … `--swell-10` — category colors (see Ombre Progress Bar)

The studio rail also overrides `--accent` at runtime from a per-theme accent
palette (see `THEMES[].accents`), and recomputes `--accent-text` for contrast via
a relative-luminance check (threshold 0.45 → dark text, else white).

## Screens / Views

### 1. Control Rail (configurator, desktop-only chrome)
- **Purpose:** choose theme/mode/accent/wallpaper. This is studio tooling, not part
  of the shipped app — in production these become user settings, not a side rail.
- **Layout:** fixed 340px column, `--studio-panel` (#16181b) background, right
  hairline `--studio-line` (#26292d), 30/26/40px padding, vertical scroll.
- **Components:**
  - Brand row: 22×22 rounded mark (filled with current accent) + "ONDULER" in
    mono 15px / .14em tracking.
  - Theme cards: full-width buttons, 1px border, 12px radius; 38×38 three-stripe
    swatch + name (mono 13.5px 600) + mood line (11px muted). Selected card gets
    `--studio-ink` border + faint white wash.
  - Mode: segmented control, 2 buttons, active pill #2a2e33.
  - Accent: row of 34×34 rounded swatches (9px radius); selected has ink ring.
  - Wallpaper: `<image-slot>` drop target, "Use as wallpaper" / "Clear" buttons,
    and a "Legibility scrim" toggle switch.

### 2. Phone — Motions Home (the actual product screen)
- **Frame:** 374×798 device, 54px outer radius, black bezel with 11px padding,
  inner screen 44px radius. Dynamic-island pill + faux status bar at top.
- **Header card** (`.headcard`): `--surface` bg, 22px radius, 1px `--border-soft`.
  Contains:
  - Kicker "ONDULER" (mono 13px, .34em tracking, `--accent`) + a `+` button.
  - Date row: day (mono 27px 500) left, points (`<b>` 26px + "PTS" 12px) right.
  - **Progress bar** `.hc-bar`: calendar icon · `.track` (flex, 5px tall, 999px
    radius, `--surface-2` background) · eye icon. The track holds `.track i`
    (`#trackFill`), the gradient fill. Width transitions .5s
    cubic-bezier(.22,.61,.36,1); background transitions .45s ease.
  - Footer row: "`{pts}` pts / 20 pts target" left, "`{pct}`%" right (mono 14px).
  - When wallpaper is on, the card gets a translucent bg + 10px backdrop blur.
- **Sections** (`#sections`): one per swell category. Header `.sec-head` (mono
  15px 700, .16em tracking) colored `var(--swell-N)`. Each row `.row`:
  - 30×30 checkbox (`--rc` = the section's swell color); when `.done` it fills
    with the swell color and reveals a check glyph (scale .4→1, .18s).
  - Motion name (mono 21px); when done → `--text-muted`.
  - Points label (mono 18px, "N pts").
  - 2×3 dot drag grip on the right.
  - Tap toggles done, emits a ripple ring animation (.7s) + 8ms haptic, recalcs.
- **Bottom nav:** 4 items (Motions/Swells/Anchors/Settings), translucent blurred
  bar, active item uses `--accent`. Home indicator below.

## The Ombre Progress Bar (core feature)

### Intent
The fill shows two things at once: **how much** of the daily target is done
(total width) and **where the effort went** (color makeup). Each swell that has
completed motions contributes a band of its color, sized to its share of the
earned points.

### Algorithm (`recalc` + `swellGradient` in the HTML)
1. Sum completed points → `total`; also bucket points per swell → `bySwell`.
2. `pct = min(100, round(total / TARGET * 100))`, `TARGET = 20`. Set fill width to
   `pct%`. (The gradient lives *inside* that width, so band proportions are
   relative to earned points, not the whole bar.)
3. Build the gradient with `swellGradient(bySwell, total)`:
   - **No points:** return solid `--accent` (placeholder; width is 0 anyway).
   - Map over sections **in on-screen order** (MOVEMENT → MIND → CREATIVITY →
     ADVENTURE), keep swells with > 0 points. Order is intentionally stable so a
     given swell always reads in the same position — only band *size* changes.
   - **One swell:** return that solid color.
   - **Multiple:** anchor the first color at `0%`, place each swell's color at its
     **band midpoint** (`(cumulative + pts/2) / total * 100`), anchor the last at
     `100%`. Midpoint placement is what produces the smooth *ombre* blend rather
     than hard segment edges. Return `linear-gradient(90deg, …stops)`.
4. Swell hex is resolved at runtime from the active theme via
   `getComputedStyle(screen).getPropertyValue('--swell-N')`.

### Known limitations to weigh when implementing
- At low totals the fill is a thin sliver, so a multi-swell ombre is hard to read
  early on. Consider a minimum legible width or a per-swell tooltip/legend.
- No legend currently maps color → swell (section headers are the only cue). A
  small legend or tap-to-highlight would close the comprehension loop.
- Adjacent swells with near-identical hues can blend muddily; depends on theme.

## Interactions & Behavior
- **Toggle motion:** tap row → toggle `.done`; on newly-completing, run ripple +
  haptic; always `recalc()`.
- **Theme/mode/accent/wallpaper:** update `data-*` attributes / CSS vars on the
  screen element; rebuild accent swatches on theme change.
- **Wallpaper:** two-step — enter edit mode (lifts the slot above content so it's
  droppable), drop/pick image, "Done" applies it as a background layer behind a
  gradient scrim; scrim toggle on/off.
- **Transitions:** fill width .5s cubic-bezier(.22,.61,.36,1); fill background
  .45s ease; checkbox/check .18s; ripple .7s ease-out; screen bg .3s.

## State Management
- `theme` (`biarritz|bolinas|default`), `mode` (`light|dark`) — **persisted** to
  `localStorage` key `onduler-studio`.
- Per-row `done` boolean (currently **not** persisted — refresh resets to the
  seeded state; add persistence for a real build).
- Derived each recalc: `total`, `pct`, `bySwell` map, gradient string.
- Active accent color (drives `--accent`, `--btn`, `--accent-text`, brand mark).
- Wallpaper src + scrim on/off.

## Design Tokens
- **Studio chrome:** bg #0e0f11, panel #16181b, line #26292d, ink #e9ecef, muted
  #8b9298, faint #5a6068.
- **Theme/mode tokens & 10 swells per theme:** see the 6 CSS blocks at the top of
  the HTML — authoritative hex values.
- **Type:** body = Manrope; mono = Spline Sans Mono (UI labels, numerics, motion
  names all use mono). Sizes called out per component above.
- **Radius:** cards 22px, header/theme cards 12px, accent swatch 9px, checkbox
  9px, track 999px, phone 54px / screen 44px.
- **Target:** daily goal = 20 pts (`TARGET`).

## Assets
- `image-slot.js` — prototype web component for the drag-drop wallpaper slot.
  Replace with the platform's native image picker in production.
- No raster assets; all icons are inline SVG, status bar is faux.
- Fonts via Google Fonts (Manrope, Spline Sans Mono).

## Files
- `Onduler Theme Studio.html` — the complete prototype (markup, all theme token
  blocks, and the `recalc` / `swellGradient` progress logic).
- `image-slot.js` — wallpaper slot component.
