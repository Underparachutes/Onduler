# Color scheme rework — cream voice + colored edge

*Brainstormed in Cowork, 2026-06-07. Implementation in Claude Code (`app/globals.css`).*

## Intent

Re-pour the three theme palettes so each light/dark pair is a better home for an uploaded
background photo (dark photos land in dark mode, light photos in light mode) and reads as
editorial. No structural change: the five token groups already exist in `globals.css`. This is
a re-pour, not a new system.

The five groups, mapped to tokens:

| Group | Tokens |
|---|---|
| **field** | `--th-bg`, `--th-surface`, `--th-surface-2`, `--th-border`, `--th-border-soft` |
| **edge** | `--th-accent`, `--th-accent-text` |
| **voice** | `--th-text`, `--th-secondary`, `--th-muted`, `--th-faint` |
| **interaction** | `--th-btn`, `--th-btn-text`, `--th-btn-hover`, `--th-focus` |
| **signal** | `--th-swell-1` … `--th-swell-10` |

## Cross-theme rules (the "system")

1. **Voice stays in the theme's identity hue, never neutral gray.** Dim tiers carry the theme's
   warmth (Biarritz cream, Bolinas taupe) or its cool identity (Default ocean blue), but they do
   not drift to a dead gray.
2. **One saturated edge per theme.** A single brand color used for the kicker and as the accent.
3. **`--th-btn-text` = the edge color in dark mode**, where the button surface (`--th-btn`) is a
   light tone the edge can sit on. Only applied where contrast clears ~3.0:1 (bold button labels).
   In light mode the primary button stays a solid dark fill with a light label (the "dark anchor"),
   and the edge is used as accent only. (Decided: Biarritz light = option A.)
4. **Focus ring stays in the voice family**, not gray.
5. **Signal is untouched.** The swell colors work; leave all ten per theme as-is.
6. **Shadows and photo legibility are untouched.** The `box-shadow` on the floating pills and the
   `text-shadow` / weight-bump rules on muted text over photos live in `globals.css` keyed to
   color-scheme, not theme tokens. None of this rework touches them. They are the editorial feel;
   keep them.

## Contrast reference

WCAG ratios for the load-bearing pairs (AA: 4.5 normal text, 3.0 large/bold):

| Pair | Ratio | Verdict |
|---|---|---|
| Biarritz dark voice: text #F0E3C7 → faint #B26A3A on field (warms to orange) | 10.9 / 8.58 / 5.72 / 3.31 | full hierarchy |
| Biarritz dark: E32712 label on cream button #EDE0C4 | 3.52 | ok for bold labels |
| Biarritz dark: accent-text #FFF7EC on edge E32712 | 4.33 | ok |
| Biarritz light: edge E32712 kicker on cream #F5EFE5 | 4.02 | under AA for small kicker |
| Biarritz light: deepened edge #C42410 kicker on cream | 5.09 | passes — recommended for light |
| Default dark: edge #E85C3A label on light button | 3.24 | ok for bold labels |
| Bolinas dark: rust #B5552A label on light button | 3.76 | ok |

---

## Biarritz (Atlantic surf)

### Dark — LOCKED (with voice recommendation)

| Token | Value | Note |
|---|---|---|
| `--th-bg` | `#15303A` | your specified field start; lifts the floor off the old `#0e2329` |
| `--th-surface` | `#1D3E49` | |
| `--th-surface-2` | `#284E5A` | |
| `--th-border` | `#2C505C` | |
| `--th-border-soft` | `#213F49` | |
| `--th-text` | `#F0E3C7` | primary cream |
| `--th-secondary` | `#E6C79A` | warms toward orange as it dims |
| `--th-muted` | `#D69A66` | terracotta-tan, replaces the old gray-green `#8a8576` |
| `--th-faint` | `#B26A3A` | burnt orange, replaces the greenish `#4e5552` |
| `--th-accent` | `#E32712` | edge |
| `--th-accent-text` | `#FFF7EC` | text on the red |
| `--th-btn` | `#EDE0C4` | cream button surface |
| `--th-btn-text` | `#E32712` | red label on cream |
| `--th-btn-hover` | `#DBCBA8` | |
| `--th-focus` | `#C9BA98` | cream focus, replaces gray `#8a8576` |
| `--th-swell-1..10` | unchanged | signal |
| `--th-wave-wash` | `rgba(196,184,160,0.10)` | re-keyed off the old hot orange to a calm cream; do NOT key to E32712 (a red wash reads as alert, wrong for the wave concept) |
| `--th-success` | `#7ec5cd` | unchanged |

**Voice note:** F0E3C7 runs as the primary (brightest) tier and the ramp descends from there.
Rather than dimming toward gray, each step warms toward orange: hue walks 41° → 36° → 28° → 24°,
saturation stays high, lightness steps 86 → 75 → 62 → 46. Contrast on the field: 10.9 / 8.58 / 5.72
/ 3.31 — full hierarchy, fully warm, ties into the E32712 edge and the orange signal swells.

### Light — LOCKED (option A: navy button, cream label)

| Token | Value | Note |
|---|---|---|
| `--th-bg` | `#F5EFE5` | cream field, unchanged |
| `--th-surface` | `#EBE3D4` | |
| `--th-surface-2` | `#DFD5C1` | |
| `--th-border` | `#D6C9B3` | |
| `--th-border-soft` | `#E4DAC6` | |
| `--th-text` | `#14334E` | navy, strong on cream |
| `--th-secondary` | `#2C5560` | teal |
| `--th-muted` | `#6B8088` | |
| `--th-faint` | `#A8B4B9` | |
| `--th-accent` | `#C42410` | edge, deepened one shade from E32712 so the 11px kicker clears AA (5.09 vs 4.02) |
| `--th-accent-text` | `#FFFFFF` | |
| `--th-btn` | `#14334E` | navy button (the dark anchor) |
| `--th-btn-text` | `#F5EFE5` | cream label |
| `--th-btn-hover` | `#2C5560` | |
| `--th-focus` | `#6B8088` | |
| `--th-swell-1..10` | unchanged | signal |

---

## Default (deep ocean) — STILL UNDER DISCUSSION, do not implement yet

> Not locked. Josh wants to keep talking through Default and Bolinas. The values below are a first
> proposal only.

Biggest debatable call: Default is currently monochromatic (accent = near-white). The system wants
a single saturated edge. I propose a warm coral to pop against the ocean blue. Alternative: keep
monochrome, or use a bright cyan pulled from the signal ramp.

### Dark

| Token | Value | Note |
|---|---|---|
| field | `#04080D` / `#0E1C2E` / `#162940`, border `#1E3450` / `#142640` | unchanged |
| `--th-text` | `#F4F7FA` | unchanged |
| `--th-secondary` | `#C0CDD8` | unchanged (blue-tinted, in family) |
| `--th-muted` | `#7E90A3` | unchanged |
| `--th-faint` | `#3E5068` | unchanged |
| `--th-accent` | `#E85C3A` | **NEW edge** (was `#f4f7fa`) — coral pop |
| `--th-accent-text` | `#06121F` | |
| `--th-btn` | `#F4F7FA` | unchanged light button |
| `--th-btn-text` | `#E85C3A` | **NEW** coral label (was `#04080d`); 3.24 bold ok |
| `--th-btn-hover` | `#C0CDD8` | unchanged |
| `--th-focus` | `#7E90A3` | unchanged |
| signal | unchanged | |

### Light

| Token | Value | Note |
|---|---|---|
| field | `#EEF3F6` / `#E2E9EE` / `#D6DFE6`, borders unchanged | |
| voice | `#0A2540` / `#2D4A63` / `#5E7386` / `#9AACBA` | unchanged |
| `--th-accent` | `#C7461F` | **NEW edge**, deepened coral for AA on light field |
| `--th-accent-text` | `#FFFFFF` | |
| `--th-btn` | `#0A2540` | navy button (dark anchor), unchanged |
| `--th-btn-text` | `#EEF3F6` | unchanged |
| `--th-focus` | `#5E7386` | unchanged |
| signal | unchanged | |

---

## Bolinas (norcal fog) — STILL UNDER DISCUSSION, do not implement yet

Debatable call: Bolinas currently leans on chartreuse (dark accent) / forest green (light accent).
Chartreuse is too light to carry a button label, so for the `btn-text = edge` parallel I propose a
**rust** edge (fits the foggy Pacific / rusted-iron / manzanita palette) and suggest keeping
chartreuse alive as `--th-success`. Alternative: keep the green/chartreuse edge and let Bolinas opt
out of the colored-button-label rule (btn-text falls back to the dark field color).

### Dark

| Token | Value | Note |
|---|---|---|
| field | `#15120F` / `#1E1A16` / `#282420`, border `#332E28` / `#272320` | unchanged earthy brown |
| voice | `#E0E3DA` / `#B3ADA3` / `#897F74` / `#504A42` | unchanged warm taupe |
| `--th-accent` | `#B5552A` | **NEW rust edge** (was `#c4d266`) |
| `--th-accent-text` | `#F5EFE5` | |
| `--th-btn` | `#E0E3DA` | light button, unchanged |
| `--th-btn-text` | `#B5552A` | **NEW** rust label (was `#15120f`); 3.76 ok |
| `--th-btn-hover` | `#B3ADA3` | unchanged |
| `--th-focus` | `#897F74` | unchanged |
| `--th-success` | `#C4D266` | chartreuse retained here so the identity color survives |
| signal | unchanged | |

### Light

| Token | Value | Note |
|---|---|---|
| field | `#EBEDE7` / `#DFE1DA` / `#D2D4CC`, borders unchanged | |
| voice | `#1F2520` / `#475048` / `#758078` / `#A7B1AA` | unchanged |
| `--th-accent` | `#B5552A` | **NEW rust edge** (was forest `#4a6845`); ~4.6 on the light field |
| `--th-accent-text` | `#FFFFFF` | |
| `--th-btn` | `#1F2520` | dark button (anchor), unchanged |
| `--th-btn-text` | `#EBEDE7` | unchanged |
| signal | unchanged | |

---

## Open decisions for Josh

1. ~~**Biarritz dark voice:**~~ RESOLVED — F0E3C7 primary, ramp descends warming toward orange
   (F0E3C7 / E6C79A / D69A66 / B26A3A).
2. **Biarritz light edge:** deepened `#C42410` for kicker legibility (recommended) vs exact
   `#E32712` brand match at 4.02 (slightly under AA for the small kicker).
3. **Default edge:** coral `#E85C3A` (proposed) vs keep monochrome vs bright cyan.
4. **Bolinas edge:** rust `#B5552A` (proposed, keeps chartreuse as success) vs keep green/chartreuse
   and opt Bolinas out of colored button labels.
5. **Colored button labels in Default/Bolinas:** apply the `btn-text = edge` rule app-wide (bold
   move) or keep it Biarritz-only.
