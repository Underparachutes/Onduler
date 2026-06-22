# Spec: Multi-swell ombré daily progress bar

*Drafted 2026-06-21. Source: `Design/design_handoff_theme_studio/` (Theme Studio
handoff). Only the progress-bar idea is in scope — the Theme Studio rail itself
maps to existing settings (themes, light/dark, accent, wallpaper) and ships
nothing new.*

## What changes

Today the daily progress bar (`DailyChecklist.tsx`) fills with a **single-color**
ombré: washed `progressBarColor` (or `--brand`) → full color, deepening as the day
fills (shipped 2026-05-21).

This makes the fill a **multi-swell** ombré: a left-to-right gradient of the
*swell colors*, each band sized to that swell's share of today's earned points (or
hours). The bar then reads as two things at once — **how much** of the daily goal
is done (fill width, unchanged) and **where the effort went** (color makeup).

It's a daily, glanceable cousin of the Logs radar / wake, which show the same
"where effort went" signal at the cycle level on the Anchors surface. This one
lives on the main Motions screen and updates live as motions are checked.

## Scope

- **In:** the daily bar only — the default (non-Views) dashboard progress bar.
- **Out (deferred):** Views (week-edit) mode keeps its single-color bar. A weekly
  multi-swell breakdown is computable from `weeklyLogMap` but adds surface area for
  little gain; revisit if wanted. The bar's footer/percent and width math are
  unchanged.

## Per-swell attribution

A logged motion's points distribute across the swells it feeds, weighted by
`contribution_weight` (the same normalized model the radar uses). So for each
motion done today (`localDone`), add `base × weight` to each of its swells, where
`base = default_points` (points mode) or `default_hours` (hours mode).

**Known approximation (v1):** `base` uses the motion's *default* points, not the
intensity-adjusted points actually logged (light/medium/deep). The gradient shows
*relative* shares, and intensity scales a motion uniformly across all its swells,
so it only mildly reweights motions against each other — not the split within a
motion. Matches the existing weekly per-swell tracking's approximation. Absolute
accuracy isn't needed; the fill *width* still comes from the accurate
server-computed `localValue`.

Orphan motions (feeding no swell) contribute to the total/width but not to any
band — same as the radar. If *only* orphans are done, fall back to the single
color (no swell makeup to show).

## Gradient algorithm

Pure helper `lib/ombre.ts`:

```
ombreGradient(bands: { color: string; value: number }[], opts?): string | null
```

1. Drop bands with `value <= 0`. If none remain → return `null` (caller falls back
   to the single-color gradient).
2. Order is **caller-supplied and stable** — the caller passes bands in on-screen
   swell order (`allSwells` order), so a given swell always reads in the same
   position; only band *size* changes between recalcs.
3. One band → return that solid color.
4. **Min-band-width floor** (closes the README's "thin sliver / unreadable early"
   limitation): each band gets at least `minShare` of the fill (default 0.08), the
   remainder distributed by true share: `final = minShare + (1 − n·minShare)·share`.
   If `n·minShare ≥ 1`, fall back to equal shares. Guarantees every contributing
   swell is visible even at a low total, and the shares always sum to 1.
5. Place stops at **band midpoints** for a smooth blend (not hard segment edges):
   anchor the first color at `0%`, each band's color at its cumulative midpoint
   `(cum + final/2)·100%`, anchor the last at `100%`. Return
   `linear-gradient(90deg, …)`.

The gradient maps across the fill element directly (the element is already
`width: progress%`), so `backgroundSize` stays `100% 100%` when the ombré is
active — unlike the single-color path, which scales a fixed ramp via
`backgroundSize` to deepen as it fills.

## Rendering

In `DailyChecklist.tsx`:

- Compute `todayBands` (memoized on `localDone`, `motions`, `submotionsMap`,
  `isHours`): bucket `base × weight` per swell across done motions, emit in
  `allSwells` order as `{ color, value }`.
- `const ombre = viewsMode ? null : ombreGradient(todayBands)`.
- Bar `style.background`: `ombre ?? <existing single-color expression>`.
- Bar `style.backgroundSize`: `ombre ? '100% 100%' : <existing scaling expression>`.
- Width transition (`.5s cubic-bezier`) and background transition unchanged, so
  bands re-flow smoothly as motions are checked.

No legend in v1 (section headers already color-code swells; the radar owns the
full breakdown). Tap-to-highlight / legend is a possible follow-up the handoff
flags but is out of scope here.

## Testing

- `lib/ombre.test.ts` (vitest): empty → null; single band → solid color; two/three
  bands → midpoint stops; min-share floor raises a tiny band and keeps the sum at
  100%; degenerate `n·minShare ≥ 1` → equal split; order preserved.
- `tsc` + `eslint` + `npm run build` clean.
- Manual: log motions across multiple swells, confirm the fill shows proportional
  bands that re-flow on check/uncheck, and that a single-swell day reads as one
  color. Confirm Views mode is unchanged.
```