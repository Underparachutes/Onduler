# Suggested commit plan

Break the implementation into focused commits so the rewrite-the-visual-design risk stays low. Each lands behind a single review.

## Branch: `design-system-v1`

### 1. `feat(tokens): refine theme palettes for Default / Bolinas / Biarritz`
- `app/globals.css`: replace 6 token blocks (3 themes × 2 modes) with refined values
- Add new semantic tokens: `--th-surface-2`, `--th-border-soft`, `--th-success`, `--th-wave-wash`
- Add `--th-swell-1` through `--th-swell-10` per theme/mode
- Register new tokens in `@theme inline`

### 2. `feat(palette): split swell palettes by mode in theme-colors`
- `lib/theme-colors.ts`: `THEME_PALETTES` becomes `{ light, dark }` per theme
- `getShuffledThemePalette(theme, mode)` and `getRandomThemeAccent(theme, mode)` accept mode
- Update call sites to pass current mode

### 3. `feat(type): swap to Courier Prime + Manrope`
- `app/layout.tsx`: Drop Geist Sans / Mono. Import Courier Prime + Manrope from `next/font/google`
- `app/globals.css`: add the `em` rule (Manrope italic), `.kicker`, `.display` tracking, body `font-feature-settings`
- `@theme inline`: point `--font-sans` at Manrope; introduce `--font-display` for Courier Prime

### 4. `feat(icons): refresh Swells / Reflections / Settings nav glyphs`
- `app/components/BottomNav.tsx`: swap three SVGs. Motions unchanged.
- Visual diff: pre/post screenshots in the PR

### 5. `fix(radar): clamp slice chord ends to wedge boundary radii`
- `lib/radar.ts` (or wherever `slicePath` lives): the chord-clamping logic in §6 of the handoff README
- Add a test case: targets `[100, 10]`, actuals `[95, 8]` — assert the rendered slice path's leftmost x stays ≥ the wedge boundary x at angle `axisAngle(0) + π/N`

### 6. `feat(locked): canvas wave-field background for unlocked Reflections`
- New helper component: `app/components/WaveField.tsx` (port from `reference/components.jsx`)
- Update locked-page render in `app/reflections/page.tsx` (or sub-component): use `WaveField` + irregular 7-vertex silhouette
- Keep the SVG `tide-drift` fallback animation in `globals.css` for browsers without canvas (defensive)

### 7. `chore(copy): empty-state + ceremony prompt voice pass`
- Grep for banned words + visible-failure copy. Update onboarding, settings, error states.
- Replace any straight-style emphasis with `<em>` so it picks up the Manrope italic rule.

### 8. `chore: design-system v1 — final touch-up after review`
- Anything caught in the verification pass.

Each commit message is short, present-tense. Apply `PROJECT.md`'s working agreements: surgical edits, no incidental rewrites.
