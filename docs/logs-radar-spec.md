# Logs page — radar redesign spec

*Drafted: May 2026. Pairs with ADR 0004 (Builds and the proficiency view), §9. Scope is the Logs page rebuild only — wave/build welcome-back doors, motion-side cadence, and `swells.hidden` live in their own roadmap sessions.*

## What this is

The Logs page becomes the diagnostic surface where the user sees their actual week against the shape they've tuned for themselves. A pie-wedge hexagon (or N-gon, one axis per active swell), with each swell holding its own color as a wedge of the target ring. The actual week is a stroke-only polygon drawn over the wedges. An unfed axis pinches to center and reads as a gap instantly — the load-bearing property the redesign must preserve.

Targets are directly editable from the chart: drag a target vertex along its radial axis to retune that swell's weekly target. Auto-saves. No confirmation modal.

## Vocabulary check

User-facing copy uses surf voice: swell, motion, tide, wave, shape. Never tasks, activities, goals, domains. Internal design conversation can call this a "radar" but UI copy says "your shape this week" / "your week against your shape."

## Geometry

**Axes.** One axis per active swell on the user. Active = exists, not deleted. Hidden swells still render unless the user toggles them off via the filter chip. Order: by `swells.sort_order`, starting at the top (-90°) and going clockwise.

- 3 swells → triangle.
- 6 swells → hexagon.
- 10 swells → decagon. Labels get tight; that's fine.

**Scale.** Per-axis radius = `(value / chart_max_pts) × chart_radius_px`. `chart_max_pts` is a single shared ceiling so all axes use the same scale.

- Initial ceiling: 200 pts/wk or 10 hrs/wk (whichever currency the user is in).
- Auto-rescale on overshoot: if any vertex (target or actual) would exceed `chart_radius_px`, increase `chart_max_pts` so the largest vertex lands at ~85% of `chart_radius_px`. Chart redraws smoothly; nothing else moves.
- Floor: 100 pts/wk or 5 hrs/wk. Don't shrink below that even if all values are tiny — keeps the chart from looking exaggerated when the user is on a wave.

**Wedges.** Each axis owns a pie-slice wedge with vertices:

```
center → intersect(chord(prev_target_vertex, this_target_vertex), left_radial)
       → this_target_vertex
       → intersect(chord(this_target_vertex, next_target_vertex), right_radial)
       → center
```

The two side corners sit on the bisector radials at `axis_angle ± π/N`. The intersection radius is `(2 R_a R_b / (R_a + R_b)) × cos(π/N)` — harmonic mean of the two adjacent target radii times `cos(π/N)`. When `R_a = R_b = R` this reduces to `R × cos(π/N)`, so the equal-target case is the same regular N-gon kite as before. When targets differ, the wedge boundary stays on the bisector radial — wedge and slice share the same radial boundaries, so the polygon's "dive" between unequal neighbors stays cleanly on the boundary line.

The N wedges tile the target ring's interior with no gaps or overlaps. Each is filled with that swell's color (`swells.color`) at `fill-opacity: 0.32` (or `0.4` for greens, which are perceptually quieter). No stroke on the wedge fills.

**Wedge separator lines.** Thin lines along the bisector radials, one per boundary between adjacent wedges. Each runs from center to the chord-intersection point shared by the two neighboring wedges. `stroke="var(--color-text-tertiary)" stroke-width="0.5" opacity="0.45"`. No additional grid hexagons.

**Target ring outline.** Implicit — it's the outer boundary of the wedge tiling. Don't draw a separate polygon outline; it would be redundant and add visual noise.

## The actual polygon

**Filled, with a stroke outline.** Each peak gets a 60° shoulder roof that matches the hexagon edge angle. Replaces the direct-line peak-to-peak polygon that shipped in v1 (which slices misleadingly through neighboring wedges when one axis is much lower than another).

**Geometry — the 60° shoulder rule.**

For each axis `i` with actual radius `r_i = (actual_i / chart_max_pts) × chart_radius_px`:

- `Peak_i` sits on the axis at radius `r_i`.
- Two **shoulders** sit on the adjacent wedge-boundary radials (at axis angle ± `π / N`), at radius `cos(π / N) × r_i` from center. For hexagon (N=6): `cos(30°) ≈ 0.866`. For pentagon (N=5): `cos(36°) ≈ 0.809`. For decagon (N=10): `cos(18°) ≈ 0.951`.

The polygon has **3N vertices** in order around the chart:

```
Peak_0, Shoulder_CW(0), Shoulder_CCW(1), Peak_1, Shoulder_CW(1), Shoulder_CCW(2), ...
```

Adjacent shoulders sit on the same boundary radial but at different radii when the two adjacent peaks differ. The polygon traces straight along the boundary radial between them — so the "dive" between a high peak and a low peak happens **on the boundary line**, not across either wedge. That's the fix.

**Why this angle.** When all actuals equal their targets and all targets are equal, the polygon becomes the regular N-gon — same shape as a fully-met target ring. When peaks differ, each wedge fills like a fuel gauge: the slice for axis `i` is the same kite shape as the target wedge, scaled by `actual_i / target_i`. Equal-everything → polygon overlaps target ring exactly. Some-empty → only the empty wedges look empty.

**Filled per-swell slices.** Each axis owns a slice:

```
slice_i = polygon( center, Shoulder_CCW(i), Peak_i, Shoulder_CW(i), center )
```

Filled with the swell's color (`swells.color`) at higher opacity than the wedge fill — start at `fill-opacity: 0.65` and tune per palette (greens may need `0.75`, ambers `0.7`). The result: each wedge shows two tones of its own color. Deeper "achieved" portion = the slice. Lighter "remaining" portion = the wedge minus the slice. Both tones come from the same hex via opacity, so light and dark mode work without media queries.

**Polygon stroke** is drawn over the slices: `stroke="var(--color-text-primary)" stroke-width="1.5" stroke-linejoin="round"`, no fill (slices already filled it). The stroke auto-adapts to light/dark mode.

**Edge cases.**

- **Actual = 0** on axis `i`: peak collapses to center, both shoulders collapse to center, slice has zero area. The polygon traces from `Shoulder_CW(i-1)` directly through center to `Shoulder_CCW(i+1)` — the dive stays on the boundary radials of axis `i`'s wedge. The wedge color shows fully behind the empty slice. Gap-as-signal preserved.
- **Actual > target** on axis `i`: peak extends beyond the wedge's target vertex; slice extends past the wedge boundary; polygon stroke visibly crosses the target ring on that axis. Auto-rescale handles anything that would clip the chart edge.
- **N < 3** is undefined. Render an empty state ("Add three or more swells to see your shape").

## Drag interaction

Each target vertex has a drag handle: `circle r="5" fill="var(--color-background-primary)" stroke="#185FA5" stroke-width="1.5"`. Active state: `r="8" fill="#185FA5"`.

**Drag is one-dimensional along the radial axis.** Pointer movement is projected onto the axis direction; perpendicular movement is ignored. Dragging toward center lowers the target; dragging toward the label raises it.

- New target value = `clamp(0, radial_distance_from_center_in_pts, hard_ceiling)`.
- Hard ceiling: 1000 pts/wk or 50 hrs/wk. Auto-rescale handles anything below that.
- Below 0 not allowed. Vertex stops at center.

**Live preview.** On every pointer move:
- Move the dragged vertex to its new position.
- Recompute the two chord-bisector intersections adjacent to that vertex (`intersect(prev, this)` and `intersect(this, next)`) — see the wedge geometry above.
- Reflow the two adjacent wedges to share the new boundary radii.
- Update the live value pill.

**Live value pill** (fixed corner of the chart panel, bottom-left): `<rect rx="13">` with surf-blue fill and white text. Format: `"{swell_name} · {value} {currency}/wk"`. Reads from the dragged vertex's current value.

- Visible only while dragging. Hidden at rest.
- Position is fixed; doesn't follow the pointer.

**Ghost dot** at the original target vertex while dragging, with a dashed leader line from ghost to current. `circle r="4" fill="none" stroke="var(--color-text-tertiary) opacity="0.5"`. Hides on release.

**On release:** persist new target to `swells.target_points` or `swells.target_hours` (whichever matches `user_settings.tracking_mode`). No toast, no confirmation. The chart is the receipt.

## Multi-class blend

Single blended shape, not two overlaid rings. Per-axis math:

```
blended_target[i] = max(primary_target[i], secondary_target[i] ?? 0)
```

Secondary only pulls outward, never shrinks. If neither build claims an axis, the user's own target on that swell stands.

`primary_target` and `secondary_target` are derived from `lib/builds.ts` preset definitions, keyed by `user_settings.primary_build` and `user_settings.secondary_build`. Computed at runtime; not stored.

**Per-build target seeding** uses the existing pattern from the Settings build picker:
- Build's anchor swells: weekly target default (100 pts or 5 hrs).
- Build's secondary swells (if defined): lower default (50 pts or 2.5 hrs).
- Non-build swells the user already has: untouched.

**Dragging a vertex on the multi-class chart edits the per-swell target** (`swells.target_points` / `target_hours`), not the build. The build identifier on `user_settings` stays put. The Settings build picker still says "you're a maker + athlete" even after the user has retuned every wedge. Reset-to-build (see below) is how they get back to the seeded shape.

**Visual indicator that multi-class is active:** small chip above the chart reading `"{primary} + {secondary}"` in muted text. Single-build users don't see this chip.

## Wave-week treatment

A "wave week" is any week the user was on a wave for any portion (intersect `wave_checkins` with the week window). Detected at render time from existing data; no new column needed.

**Panel-level treatment:**
- Subtle blue wash: a `<rect>` over the panel with `fill="#378ADD" fill-opacity="0.08"`. Works in light and dark mode.
- Wavy underline beneath the panel subtitle (decorative): `<path>` with `stroke="#378ADD" stroke-width="1" stroke-opacity="0.55"`, a 6–8-bump sine wave spanning the panel width.

**Softened ring:**
- All target values multiplied by the active ramp percentage (read from the welcome-back flow's chosen value — placeholder for now since that surface isn't built; default to 100% / no softening if no ramp is set).
- Wedge fills render at the same `fill-opacity`, just at smaller radius.
- Drag handles still present and functional. Editing a target during a wave week edits the underlying `target_points` / `target_hours` — not the ramp percentage. The ramp is its own setting.

**Ramp pill (top-right corner of panel, read-only on Logs page):**
- `"Ramp · 70%"` or `"Ramp · 40%"`, light fill, blue text.
- Visible only on wave weeks. Tap to navigate to the welcome-back/ramp settings surface (built in a later session). For v1 this can be a no-op tap that surfaces a small "Adjust in Settings" hint.

**Gap-as-signal is preserved.** Family at zero still pinches to center on a wave week. The wave wash and softened ring do not paper over the absence.

## UI affordances

**Fixed corner pill (live drag readout).** Bottom-left of chart panel. Visible only during drag.

**Reset-to-build chip.** Bottom-right of chart panel. Always visible when a build is active.
- Copy: `"↻ Reset to the {build_name}"` for single-build (e.g., "Reset to the maker"). For multi-class: `"↻ Reset to maker + athlete"`.
- Tap: opens a small confirm dialog listing which targets would change ("Mind 60 → 100, Movement 30 → 50"). Per-row opt-out checkbox (matches the build-picker preview pattern from ADR 0004). Confirming applies the build's seeded targets to the opted-in swells. Logs, motions, and non-target swell state are untouched.

**Filter toggle (hide hidden swells).** Top-right of chart panel.
- Pill with checkbox. Copy: `"Hide hidden swells"`.
- Default: off (hidden swells show on the chart, since the gap-as-signal still applies to them).
- When on: hidden swells are excluded from the axis set; chart re-tiles with fewer wedges.
- Local UI state; not persisted unless we want to bias toward less-noisy charts later.

**Per-wedge actions (long-press / right-click on a wedge or its handle).** Small menu:
- `"Edit {swell name}"` — opens the swell detail (existing surface).
- `"Hide swell"` — sets `swells.hidden = true` (gated until the swells.hidden session ships; for v1, omit this menu item).
- `"Delete swell"` — confirm dialog warning about logs preserved but swell row gone. Same destructive flow as the existing swell delete from the swells page.

For v1 the long-press menu is enough; no need for an inline `×` on each wedge.

## Pair fixes that ride along

From the roadmap row for this session:

1. **Log page stat trio respects tracking currency.** Currently the Log page surfaces an HRS stat even when the user is in Points mode, with the same number on both lines (because `default_points` and `default_hours` default to 1 each). Hide the non-active currency stat. Single stat in the user's currency.
2. **Lifetime stat goes absolute in week one.** When `weeks_since_first_log <= 1`, show the lifetime stat as an absolute total ("87 pts, all time") instead of a ratio against `target × weeks`. After week 1 the existing ratio display returns. Applies to the proficiency view's Lifetime tab and the Log page's lifetime stat.
3. **Swells page weekly aggregate — revisit.** The `"N / 1000 weekly · M%"` aggregate at the top of the Swells page was flagged as visually noisy but is intentional (teaches users to right-size targets). With the radar landing on the Logs page, the aggregate's teaching job may be partially done by the chart. Decide during build: keep, soften, or remove. Default: soften (smaller type, less prominent) but don't remove.
4. **Weekly target defaults re-tune.** Pull a few weeks of normalized contribution data (post-ADR 0003) before changing the 100 pts/wk and 5 hrs/wk defaults. If post-normalization data shows users hitting <60% of target weekly, drop defaults to 75 pts / 4 hrs. Not in v1 of this build — observation-first.

## Schema

No new tables. No new columns. Everything renders from existing data:

- `swells.target_points`, `swells.target_hours` — current weekly targets, edited via drag.
- `swells.color` — wedge fill color.
- `swells.sort_order` — axis order.
- `swells.hidden` — currently doesn't exist on schema; treated as "all swells visible" for v1. When the `swells.hidden` session ships, the filter toggle reads this column.
- `motion_swells.contribution_weight` — feeds the actual-value-per-swell aggregation (existing logic from the Swells page).
- `user_settings.tracking_mode` — drives currency display in pills and labels.
- `user_settings.primary_build`, `user_settings.secondary_build` — feed multi-class blend.
- `wave_checkins.checked_in_at`, `wave_checkins.duration_seconds` — drive wave-week detection at render time.
- `logs.logged_at`, `logs.points`, `logs.hours` — feed the actual polygon (existing weekly aggregation logic).

If anything in the build feels like it wants a new column, surface it before adding — the spec assumes we ride existing schema.

## File-level scope

Likely touch points (verify against actual codebase before editing):

- `app/log/page.tsx` (or wherever the current Log page lives) — replace the existing report layout with the new radar surface. Keep the period filter, swells breakdown, daily chart, activity feed, and waves sections below the radar — radar goes at the top.
- New component: `components/SwellRadar.tsx` (or similar) — the chart itself. Pure SVG, no D3 needed for a hexagon. Accept `swells`, `actuals`, `targets`, `wave_week_ramp_pct`, `currency` as props.
- New helper: `lib/radar.ts` — pure functions for vertex math, wedge kite computation, midpoint reflow, blended-target math. Easy to test.
- Server-side data fetching: extend the Log page's parallelized fetch (per PROJECT.md: dashboard, log, settings pages already use `Promise.all`) to include the swells + targets + this-week's per-swell actuals + wave-checkin window.
- Update copy in `lib/builds.ts` if reset-chip wording references it.

## Out of scope for this session

- Wave/build welcome-back doors with the two cards ("Ease back in" / "Pick up your shape"). Lives in its own session.
- Minimum-viable-shape auto-selection and the Settings affordance to drop/swap/add anchors. Same session as welcome-back.
- Motion-side cadence on the motion detail sheet. Separate session.
- `swells.hidden` schema + UI. Separate session. Until it ships, the filter chip is a no-op or hidden.
- Tier badges (Apprentice / Adept / etc.). Deferred indefinitely per ADR 0004.
- Submotions visualization. Gated behind `SUBMOTIONS_ENABLED`.
- Milestone display on the Logs page. Milestones live on the per-swell proficiency view, not on Logs.

## Acceptance check

Before calling this done, the following should be true:

- Hexagon (or N-gon) renders for any user with ≥ 3 active swells.
- Each wedge is the swell's color at the documented opacity.
- Actual polygon pinches to center on any swell with zero logs this week.
- Dragging a target vertex toward center lowers the target and persists on release.
- Dragging outward raises the target; chart auto-rescales if any vertex hits the edge.
- Adjacent wedges visibly reflow during a drag.
- Live pill shows the dragged value in the user's currency; hidden at rest.
- Reset-to-build chip shows the user's build name(s); confirm dialog lists per-swell changes with opt-outs.
- Wave-week panel has the wash and the ramp pill; softened ring is editable; gap-as-signal still works.
- Multi-class shape is one blended polygon (per-axis max), with a small "{primary} + {secondary}" chip.
- Tracking currency on the Log page stat trio is correct (pair fix #1).
- Lifetime stat in week one shows an absolute total, not a ratio (pair fix #2).

## Decisions deferred to build-time

- Long-press vs right-click vs explicit edit-mode for the per-wedge action menu. Pick whatever matches the existing motion-reorder long-press pattern on the dashboard for consistency.
- Exact wedge fill opacity per swell color (greens read quieter, blues/pinks read louder at the same alpha). Tune visually during build; the 0.32 / 0.40 split in this spec is a starting point.
- Whether the reset chip's confirm dialog reuses the build-picker preview component from Settings or is its own smaller surface. Reuse if it doesn't require contortions.
- Whether wedge separator lines are visible at all, or just implied by the color boundary. If the swell colors are sufficiently distinct in the user's palette, drop the lines.
