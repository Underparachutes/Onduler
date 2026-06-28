# Suggested commit plan

Break the implementation into focused commits so the rewrite-the-visual-design risk stays low. Each lands behind a single review. Sequencing matches the **Wave 1 / Wave 2** split in `README.md` — Wave 1 is pure visual swap, Wave 2 is the load-bearing color-index data migration.

---

## Wave 1 — visual swap

### Branch: `design-system-v1-visuals`

#### 1. `feat(tokens): refine theme palettes for Default / Bolinas / Biarritz`
- `app/globals.css`: replace 6 token blocks (3 themes × 2 modes) with refined values
- Add new semantic tokens: `--th-surface-2`, `--th-border-soft`, `--th-success`, `--th-wave-wash`
- Add `--th-swell-1` through `--th-swell-10` per theme/mode
- Register every new token (semantic + all 10 swells) in `@theme inline` so Tailwind can use them — `bg-th-swell-3`, `text-th-success`, etc.

#### 2. `feat(type): swap to Courier Prime + Manrope`
- `app/layout.tsx`: drop Geist Sans / Mono. Import Courier Prime (400, 700 — **no italic subset**, deliberately dropped because the `em` rule routes italic to Manrope) + Manrope (300, 400, 500, 600, 700; italic 400, 500) from `next/font/google`
- `app/globals.css`: add the `em` rule (Manrope italic), `.kicker`, `.display` tracking, body `font-feature-settings`
- `@theme inline`: point `--font-sans` at Manrope; introduce `--font-display` for Courier Prime

#### 3. `feat(icons): refresh Swells / Reflections / Settings nav glyphs`
- `app/components/BottomNav.tsx`: swap three SVGs. Motions unchanged.
- Visual diff: pre/post screenshots in the PR

#### 4. `fix(radar): clamp slice chord ends to wedge boundary radii`
- `lib/radar.ts` (or wherever `slicePath` lives): the chord-clamping logic in §6 of the handoff README
- Add a test case: targets `[100, 10]`, actuals `[95, 8]` — assert the rendered slice path's leftmost x stays ≥ the wedge boundary x at angle `axisAngle(0) + π/N`

#### 5. `feat(locked): canvas wave-field background for unlocked Reflections`
- New helper component: `app/components/WaveField.tsx` (port from `reference/components.jsx`)
- Update locked-page render in `app/reflections/page.tsx` (or sub-component): use `WaveField` + irregular 7-vertex silhouette
- Keep the SVG `tide-drift` fallback animation in `globals.css` for browsers without canvas (defensive)

#### 6. `chore(copy): empty-state + ceremony prompt voice pass`
- Grep for banned words + visible-failure copy. Update onboarding, settings, error states.
- Replace any straight-style emphasis with `<em>` so it picks up the Manrope italic rule.

#### 7. `chore: design-system v1 visuals — final touch-up after review`
- Anything caught in the verification pass against `reference/Onduler Design System.html`.

---

## Wave 2 — color-index migration

Start this branch **only after Wave 1 is in main and verified.** This wave touches the data model and every component that renders a swell color; do it with a clear head.

### Branch: `design-system-v1-color-index`

#### 8. `feat(schema): add swells.color_index for indexed palette resolution`
- Migration: `ALTER TABLE swells ADD COLUMN color_index smallint`
- Backfill SQL: for each swell, compute nearest-match index against `THEME_PALETTES[user.theme].light` using RGB distance (cosmetic choice — single-user, one week of data)
- `ALTER TABLE swells ALTER COLUMN color_index SET NOT NULL`
- Keep `swells.color` for now — Wave 2 dual-reads during the refactor

#### 9. `refactor(theme-colors): shrink to index helpers + Tailwind safelist`
- `lib/theme-colors.ts`: replace `THEME_PALETTES` hex tables with `getRandomSwellIndex()` + `getShuffledSwellIndices()` + `hexToNearestIndex()` (migration helper). The actual colors live in `app/globals.css` now.
- `tailwind.config`: add `safelist: [...Array(10).keys()].map(i => \`bg-th-swell-\${i+1}\`)` (plus `text-` variants if used)
- Or — preferred — a `swellColorClass(i: SwellColorIndex)` helper that returns the literal class string so Tailwind's purge sees every variant statically

#### 10. `refactor(swell-color): flip consumers from hex to indexed token`
- Surfaces to update (verified via grep): `app/dashboard/components/DailyChecklist.tsx`, `app/dashboard/components/SortableMotionList.tsx`, `app/dashboard/components/CadenceSection.tsx`, `app/settings/SettingsPanel.tsx`, `app/settings/EditGroupForm.tsx`, `app/reflections/ceremony/week/FrozenRadar.tsx`, `app/reflections/ceremony/week/WeekCeremony.tsx`, `app/reflections/page.tsx`, `app/components/SwellRadar.tsx`
- Pattern: `style={{ backgroundColor: swell.color }}` → `className={swellColorClass(swell.color_index)}`
- SVG fills: `fill={swell.color}` → `fill={\`var(--th-swell-\${swell.color_index})\`}`
- Onboarding swell-seed flow: switch from `getShuffledThemePalette` (returned hexes) to `getShuffledSwellIndices` (returns indices), persist `color_index` not `color`

#### 11. `chore(schema): drop swells.color after Wave 2 verification`
- Run only after the consumer refactor has been in main for at least a day with no rendering regressions
- `ALTER TABLE swells DROP COLUMN color`
- Update any export/import code paths that referenced `color` (`/api/export` — verify it now emits `color_index` not `color`, and that the user-facing export still translates per ADR 0006)

---

Each commit message is short, present-tense. Apply `PROJECT.md`'s working agreements: surgical edits, no incidental rewrites. Commit after every chunk; push when the branch is ready for review.
