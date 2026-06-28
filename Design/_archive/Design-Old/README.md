# Handoff: per-theme motion celebrations

## Overview

Replace the **per-motion log celebration** (the one that fires on every motion check) with two new theme-specific celebrations:

- **Tjörnuvík** (default theme) — **Ripple**: checkbox spring-pops, a single expanding ring of the row's swell color radiates from it.
- **Biarritz** — **Tide line**: a 2px swell-color line draws across the bottom of the row, left to right.

**Bolinas** is already wired (currently uses `bloom`); leave it alone.

The **swell-crossing celebration** (the existing `bloom` — fires when a motion log crosses a swell's weekly target) is **also unchanged**. That's a different, bigger moment and the bloom still works for it.

## About the design files

The bundled `prototype/` folder contains an **HTML/React design reference** — a working prototype of both celebrations in both themes (light + dark), rendered with the design system tokens. **It is a reference, not production code.** Recreate the animations in the actual codebase using existing patterns (TypeScript, Tailwind, `--th-*` token vars, the existing `CelebrationOverlay` + `DailyChecklist` architecture).

Open `prototype/Final Celebrations.html` in a browser to see both animations live. Tap any row to fire on tap, or use the Replay button.

## Fidelity

**High-fidelity.** Animation timing, easing, sizes, and behavior are spec'd to the millisecond below. Match these closely.

## The change in one diff

The current per-motion celebration lives in two places:

```
onduler/app/dashboard/components/CelebrationOverlay.tsx
onduler/app/dashboard/components/DailyChecklist.tsx  →  getAnimType()
```

`getAnimType()` currently maps theme → celebration type:

```ts
function getAnimType(): CelebrationState['type'] | null {
  const theme = document.documentElement.dataset.theme ?? 'biarritz'
  if (theme === 'biarritz') return null        // ← Biarritz has NO per-motion celebration right now
  if (theme === 'bolinas') return 'bloom'      // ← keep
  return 'glow'                                // ← Tjörnuvík uses the global scaling glow
}
```

After this change:

```ts
function getAnimType(): CelebrationState['type'] | null {
  const theme = document.documentElement.dataset.theme ?? 'biarritz'
  if (theme === 'biarritz') return 'tideline'  // ← NEW
  if (theme === 'bolinas') return 'bloom'      // ← unchanged
  return 'ripple'                              // ← NEW (replaces glow)
}
```

The `'glow'` type can be removed from `CelebrationState['type']`. The `celebration-glow` keyframe in `globals.css` can be removed. Two new types — `'ripple'` and `'tideline'` — replace it.

## Architectural shift: row-based, not global

The current `'glow'` animation is rendered by `CelebrationOverlay` as a **global fixed-position element** positioned at the tap's `clientX/clientY`. Both new celebrations are **row-based** — they happen inside the motion row itself and end with the row collapsing out of the list. This is a meaningful architectural change. Two options:

### Option A (recommended): celebrations move into the motion row component

`CelebrationOverlay` no longer handles the per-motion celebration at all — it stays only for the swell-crossing `bloom` (a global event, fires at tap location). The per-motion celebration moves into the motion-row render path in `DailyChecklist.tsx`.

State shifts from `celebration: CelebrationState | null` to something like:

```ts
const [celebrating, setCelebrating] = useState<{ motionId: string; kind: 'ripple' | 'tideline' } | null>(null)
```

Per-motion celebration `setDivingId` + the existing 550ms `duck-dive` timeout are **replaced** by the new animations (which include their own row collapse). The swell-crossing `bloom` still uses the existing global overlay + `setCelebration`.

### Option B (minimal-change): keep `CelebrationOverlay`, add row-aware mode

Keep `CelebrationOverlay` as the single celebration component but pass it a `rowRect` (bounding box of the tapped row) instead of `{x, y}` for the new types. The overlay renders an SVG/element positioned over the row's bounding box. The row itself still uses `duck-dive`; the celebration overlays on top.

Option A is cleaner and more honest to what the celebrations want to be. Recommended.

## Specs

Both celebrations:
- **Fire on motion check** (the per-motion log), regardless of whether it also crosses a swell target. If a swell IS being crossed, the bloom fires too — both can happen simultaneously (different layers).
- **Color**: the row's **primary swell color** (the swell with the highest contribution_weight). Fall back to `var(--th-accent)` if the motion has no swells.
- **End state**: row is removed from the list (existing `setLocalDone` + `hideDone` behavior; the animation's collapse phase finishes flush with the row being removed from the DOM).
- **Respect** `prefers-reduced-motion`: skip animation, jump straight to done state.
- **Respect** the `celebration_enabled` user setting (already handled at call site).
- **Total duration**: ~900–950ms, then row gone.

### Ripple (Tjörnuvík)

Total duration: **900ms**.

Phases (driven by `t` from 0 → 1 over 900ms; use `easeOutCubic`):

| t range | Event |
|---|---|
| 0 → 0.10 | Checkbox border + background fade in to swell color (`fillP`). Checkmark `<svg>` becomes visible. |
| 0 → 0.18 | Checkbox spring scale: `t < 0.09` → scale up `1 → 1.18`; `t < 0.18` → scale back `1.18 → 1`. Linear inside each half. |
| 0.05 → 0.50 | Expanding ring: a `<span>` positioned absolutely on the checkbox, `border: 1.5px solid {swellColor}`, `border-radius: 50%`, `width = height = 20 + ringP * 84`, centered with `translate(-50%, -50%)`. Opacity = `(1 - ringP) * 0.55`. |
| 0.25 → 0.50 | Text + points dim from opacity 1 → 0.45. At `t > 0.50`, `text-decoration: line-through` with `text-decoration-color: var(--th-faint)`. |
| 0.55 → 1.00 | Row collapses: container `height: 52 → 0`, `overflow: hidden`, border-bottom drops when height < 1. |

Reduced-motion fallback: skip the animation, set the row to done state (filled checkbox, dimmed text, line-through), let the existing `hideDone` collapse-on-remove behavior take over.

**Reference**: `prototype/final-celebrations.jsx` → `RippleRow` function. The HTML prototype is the source of truth for behavior — match it.

### Tide line (Biarritz)

Total duration: **950ms**.

Phases (driven by `t` from 0 → 1 over 950ms; use `easeOutCubic`):

| t range | Event |
|---|---|
| 0 → 0.08 | Checkbox fills with swell color (`fillP`). Checkmark visible. |
| 0 → 0.55 | Tide line draws across the row's bottom edge: a `<div>` positioned `absolute; left: 0; bottom: 0; height: 2px`, `width: ${lineP * 100}%`, `background: {swellColor}`. |
| 0.25 → 0.55 | Text + points dim from opacity 1 → 0.45; at `t > 0.50`, line-through added. |
| 0.55 → 0.85 | Tide line fades to 0 opacity (still 2px tall, full width, but transparent). |
| 0.55 → 1.00 | Row collapses: container `height: 52 → 0`, `overflow: hidden`. |

Reduced-motion fallback: same as Ripple.

**Reference**: `prototype/final-celebrations.jsx` → `TideLineRow` function.

## State management notes

The existing per-motion flow in `DailyChecklist.tsx → handleLog`:

```ts
if (celebrationEnabled) {
  setDivingId(motion.id)
  setTimeout(() => {
    setDivingId(null)
    setLocalDone(prev => new Set([...prev, motion.id]))
  }, 550)
}
```

Should become something like:

```ts
if (celebrationEnabled) {
  const kind = getAnimType() // 'ripple' | 'tideline' | 'bloom' | null
  if (kind === 'ripple' || kind === 'tideline') {
    setCelebrating({ motionId: motion.id, kind })
    // Don't setLocalDone yet — the celebration component fires onDone after its
    // collapse phase completes, which then marks the motion done and removes
    // the row.
  } else if (kind === 'bloom') {
    setCelebration({ x: clientX, y: clientY, type: 'bloom' }) // global overlay
    setDivingId(motion.id) // existing duck-dive for bolinas
    setTimeout(() => {
      setDivingId(null)
      setLocalDone(prev => new Set([...prev, motion.id]))
    }, 550)
  }
}
// note: the existing crossesSwell → bloom logic still works on top of this.
// If the motion ALSO crosses a swell target, fire the bloom too:
if (celebrationEnabled && crossesSwell) {
  setCelebration({ x: clientX, y: clientY, type: 'bloom' })
}
```

The exact integration shape is yours — the key invariants are:

1. **Don't mark the motion as done until the celebration's collapse phase has finished** — otherwise the row gets removed mid-animation. The celebration component should call `onDone` when its collapse reaches height 0; the parent then runs `setLocalDone`.
2. **Single celebration at a time** — guard against re-firing while one is in flight (the existing `setDivingId` guard works for this, you'd swap to checking `celebrating != null`).
3. **The swell-bloom is independent** — it can fire alongside ripple/tideline; they happen on different layers (bloom = global overlay at tap location, ripple/tideline = inside the row).

## Design Tokens

All colors come from existing `--th-*` tokens. The new celebrations only introduce:

- **Swell color** (already exists as `swell.color` on the motion's primary swell — fetched from DB)
- **Foam/ring stroke** uses the same swell color directly

No new tokens needed.

## Files to reference

- `prototype/Final Celebrations.html` — open in a browser to see both animations live in both themes × both modes
- `prototype/final-celebrations.jsx` — the React reference implementation (`RippleRow`, `TideLineRow`)
- `prototype/tokens.css` — the design-system tokens it runs against

## Files to edit in `onduler/`

- `app/dashboard/components/CelebrationOverlay.tsx` — remove `'glow'` from the `type` union; keep `'bloom'`. Optionally split out so this file handles only the global overlay (bloom) and the row-based celebrations live elsewhere.
- `app/dashboard/components/DailyChecklist.tsx` — update `getAnimType()`, add new state for in-row celebrations, integrate into `handleLog`.
- `app/globals.css` — remove `@keyframes celebration-glow` if Option A; keep `celebration-particle` for bloom.

## Out of scope / leave alone

- The `bloom` particle celebration (swell-target crossing) — unchanged
- Bolinas's per-motion celebration (uses `bloom`) — unchanged
- The haptic flow (`navigator.vibrate`) — unchanged
- `celebration_enabled` user setting & Settings UI — unchanged
- Everything in `app/onboarding/` — unchanged

## Open questions to confirm before shipping

1. Should the existing `duck-dive` 8px translate fade still run on the row underneath Ripple/Tide line, or is it replaced entirely? Recommendation: **replace** — the new celebrations already include their own row collapse, and the dive would just be visual noise underneath. Don't keep both.
2. For accessibility, should the celebration be announced via `aria-live`? Probably not — it's decorative. The motion's checked state change is what assistive tech announces.
