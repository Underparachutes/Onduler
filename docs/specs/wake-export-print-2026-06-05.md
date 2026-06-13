# Export your wake as a print

*Brainstorm session 2026-06-05 (Cowork). Implementation in Claude Code.*

From the aesthetic brief (`docs/aesthetic-sensibility.md`, §"The wake as an art object" and punch
list item 5). The marketing wake SVG endpoint (`/api/wake-svg`) is already an art object, but it
is seeded random. This feature lets a user export **their own** wake, seeded from real logged
data, as a print-ready SVG they can hang, gift, or keep. It turns the app's central visual
metaphor into a physical object.

## Decisions (2026-06-05)

- **Free for everyone.** No supporter gate. This is brand leverage and matches the gift-not-guilt
  posture: people share their printed wake, the metaphor spreads. Consistent with the no-ads
  starting position.
- **Scope: any period the filter supports** (week / month / quarter / year), plus chapter as a
  bonus keepsake entry from the chapter-detail page. The window mirrors the existing Anchors
  period filter.
- **Monochrome stays.** The wake is monochrome by spec (no swell colors, ADR 0010). The export
  keeps that. Saturation is reserved for swell identities; the wake is the wave silhouette.

## The data path

The marketing path uses `generateRandomWake(seed, n, …)`. The user path must use real actuals.
`lib/wakes.ts` already exposes `wakePolygonPath(actuals, radius, center)`, which is exactly the
per-swell shoulder polygon we want. The Anchors page already computes `radarActuals: number[]`
(one value per non-hidden swell, period-filtered, bonus-folded) via `actualsFor(periodLogs)`. That
array is the seed for a real wake.

### New helper in `lib/wakes.ts`

```ts
// Print-ready SVG from a user's real per-swell actuals for a period.
// Mirrors wakeToSvg's glow + stroke treatment but takes actuals, not a seed.
export function userWakeToSvg(
  actuals: number[],
  opts: {
    size?: number          // default 800
    bg?: string            // default per variant
    stroke?: string        // default per variant
    title?: string         // rendered as a small caption, optional
  } = {},
): string
```

- Use `wakePolygonPath(actuals, r, center)` with `r = size * 0.35`, center at `size/2`.
- Keep the soft glow layer (gaussian blur, fill at ~6% opacity) behind the sharp stroke, same as
  `wakeToSvg`.
- **Quiet-window case:** if every actual is 0 (a wave week, or a window with no logs),
  `wakePolygonPath` returns `''`. Fall back to `circlePath(r, center)` rendered at the same stroke.
  A quiet week still has a wake: the pulsing circle. This is on-brand, not an error state.
- If a `title` is passed, render it as small caption text near the bottom, in the stroke color at
  low opacity, in the body mono font family (reference the font by name in a `font-family`
  attribute so it degrades gracefully when the SVG is opened outside the app).

### Print variants

Default the user export to a **paper** variant (dark stroke on warm white) so it prints without
flooding a page with ink, and offer a **night** variant (light stroke on near-black) matching the
marketing aesthetic.

```
paper: bg #faf8f3, stroke #1a1a1a
night: bg #000000, stroke #e8e6e1   (matches /api/wake-svg defaults)
```

Expose `variant` as the knob; map it to the bg/stroke pair inside the route so callers pass one
word, not two hex codes.

## The title: place plus time

The brief wants wakes named by place and time, the way Josh captions photographs, not by seed
number. Build a small helper:

```ts
// e.g. "Bolinas · Week of June 1", "Biarritz · June 2026", "Tjørnuvík · 2026"
export function wakeTitle(themeKey: string, periodStart: DayKey, period: Period): string
```

- **Place** comes from the active theme. Map theme key to its place name:
  `biarritz → Biarritz`, `bolinas → Bolinas`, `tjornuvik → Tjørnuvík`. Default theme has no place
  name yet; use `Onduler` until the Aquatic Park dusk palette ships (punch-list item 1), then
  `Aquatic Park`. Keep the map in one place so it updates with the theme roster.
- **Time** reuses the existing period label formatters (`periodDateLabel` on the Anchors page /
  `formatCycleLabel` in `lib/cycles.ts`). Week → "Week of June 1", month → "June 2026", quarter →
  "April–June 2026", year → "2026".
- The playful single-weekday style from the brief ("Bolinas Tuesday") fits a *daily* wake. Daily
  export is not in this scope; note it as the natural form if a daily wake ships later.

The title is the SVG caption and the basis for the download filename (slugified, e.g.
`bolinas-week-of-june-1.svg`).

## The endpoint

Add an authenticated route, distinct from the public marketing one:

```
GET /api/wake/me?period=week&start=YYYY-MM-DD&variant=paper[&download][&chapter=<id>]
```

- Auth required (reads the signed-in user's logs). 401/redirect if no session.
- Resolve the period window from `period` + `start` using the same logic the Anchors page already
  has (`sundayOf` / `monthStartKey` / `quarterStartKey` / `yearStartKey` + the matching end-key
  helpers in `lib/periods.ts`). If `chapter` is passed, scope to that chapter and use its full
  date range instead of a period window.
- Load non-hidden swells (chapter-scoped) + logs in the window, aggregate to `actuals[]` with the
  **same per-swell weighting** used in `actualsFor` on the Anchors page (contribution weight,
  points/hours by tracking mode, bonus folded for points mode). Factor that aggregation into a
  shared helper if it is currently inline, so the route and the page cannot drift.
- Compute `wakeTitle(...)`, call `userWakeToSvg(actuals, { variant→bg/stroke, title })`.
- Return `image/svg+xml`. `download` flag adds `Content-Disposition: attachment` with the
  slugified-title filename. **Do not** set the immutable year-long cache header the marketing route
  uses; user data changes. Use `private, no-store` (or a short max-age).

Keep `/api/wake-svg` exactly as is for marketing. The two paths share `lib/wakes.ts` helpers but
serve different masters (public seeded vs. private real).

## Entry points

The wake is a multi-swell silhouette, so its home is surfaces that already show the whole shape,
not the per-swell proficiency view (the brief mentions the proficiency view, but that view is
single-swell; the wake does not belong there. Note this divergence and skip it).

1. **Journal week cards** (`/anchors/journal`). The `LogsOnlyWeek` and `AnchorsWeek` renderers
   already draw a `FrozenRadar` wake per week. Add a small "Export this wake" affordance (a quiet
   download/share glyph) on each week card. Builds the `period=week&start=<weekStart>` URL.
2. **Anchors period header** (`/anchors`). A quiet "Export wake" link near the radar that uses the
   currently selected period and start. One tap from the surface the user is already on.
3. **Chapter detail** (`/settings/chapters/[id]`). An "Export this chapter's wake" row, using
   `chapter=<id>`. The season keepsake the brief calls out.

Each entry opens a lightweight preview: the SVG rendered large, the auto-title shown above it, a
variant toggle (Paper / Night), and a Download button (hits the route with `&download`). Keep the
preview minimal; no editing of the wake itself, picking the window and variant is the only knob,
which matches the "picking a photo is the only knob" restraint in the legibility spec.

## Voice

Caption and button copy follow the brief: no achievement language, weather/water register. "Export
this wake" and the place-plus-time title carry it. No banned words. No em dashes.

## Out of scope

- PNG/JPG rasterization. SVG only for v1 (vector prints at any size). A canvas raster path is a
  future addition if users ask for it.
- Daily wakes and the "Bolinas Tuesday" single-weekday naming.
- Per-swell wake export from the proficiency view (the wake is multi-swell by definition).
- Letting users recolor the wake or add their own caption text.
- Physical print fulfillment / ordering. The user exports the file and prints it themselves.
