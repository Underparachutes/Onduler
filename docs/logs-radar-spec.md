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

**Wedges.** Each axis owns a kite-shaped wedge with vertices:

```
center → midpoint(prev_target_vertex, this_target_vertex)
       → this_target_vertex
       → midpoint(this_target_vertex, next_target_vertex)
       → center
```

The six wedges (or N wedges) tile the target ring polygon's interior with no gaps or overlaps. Each is filled with that swell's color (`swells.color`) at `fill-opacity: 0.32` (or `0.4` for greens, which are perceptually quieter). No stroke on the wedge fills.

**Wedge separator lines.** Thin radial lines from center to each target vertex, `stroke="var(--color-text-tertiary)" stroke-width="0.5" opacity="0.45"`. Doubles as the axis line. No additional grid hexagons.

**Target ring outline.** Implicit — it's the outer boundary of the wedge tiling. Don't draw a separate polygon outline; it would be redundant and add visual noise.

## The actual polygon

Stroke only, no fill. `stroke="var(--color-text-primary)"` or a deep surf navy (`#042C53`) — whichever reads better against the wedge palette in the user's active theme. `stroke-width="2"`, `stroke-linejoin="round"`.

Vertices computed the same way as target vertices, using `actual_value_this_week` per axis. An unfed axis (actual = 0) collapses its vertex to the center. The polygon line goes from the previous vertex, through the center, to the next vertex — pinching diagonally across the unfed wedge. The wedge color stays fully visible behind the pinch; that's the gap-as-signal.

If actual exceeds target on any axis, the polygon vertex sits outside that wedge. The polygon line crosses the wedge boundary visibly — celebration is built into the geometry.

## Drag interaction

Each target vertex has a drag handle: `circle r="5" fill="var(--color-background-primary)" stroke="#185FA5" stroke-width="1.5"`. Active state: `r="8" fill="#185FA5"`.

**Drag is one-dimensional along the radial axis.** Pointer movement is projected onto the axis direction; perpendicular movement is ignored. Dragging toward center lowers the target; dragging toward the label raises it.

- New target value = `clamp(0, radial_distance_from_center_in_pts, hard_ceiling)`.
- Hard ceiling: 1000 pts/wk or 50 hrs/wk. Auto-rescale handles anything below that.
- Below 0 not allowed. Vertex stops at center.

**Live preview.** On every pointer move:
- Move the dragged vertex to its new position.
- Recompute the two midpoints adjacent to that vertex (`mid(prev, this)` and `mid(this, next)`).
- Reflow the two adjacent wedges to share the new boundaries.
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
