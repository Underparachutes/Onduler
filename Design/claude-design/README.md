# Onduler — Claude Design library

This folder is the **local source for the Onduler design system on claude.ai/design**. It is synced up with the `DesignSync` tool (one component at a time, never a wholesale replace).

## Source of truth

These cards are **derived from the live codebase**, not from any handoff bundle. The old `design_handoff_*` folders and zips are archived under `Design/_archive/` — they are stale (wrong fonts, older hex, pre-"Anchors" vocabulary) and should not be used as reference.

When a card and the code disagree, **the code wins**. The canonical sources are:

| Concern | File |
|---|---|
| Color tokens (3 themes × light/dark) | `app/globals.css` |
| Per-swell accent palettes | `lib/theme-colors.ts` |
| Fonts | `app/layout.tsx` (`IBM_Plex_Mono` → `--font-sans`, `Manrope` → `--font-display`) |
| Bottom nav icons | `app/components/navItems.tsx` |
| Motion row / daily bar | `app/dashboard/components/DailyChecklist.tsx`, `SortableMotionList.tsx` |
| Swell row / tide bar | `app/swells/SwellRow.tsx` |

## Structure

```
Design/claude-design/
├── README.md
├── foundations/
│   ├── colors.html      ← semantic tokens + 10-color swell ramp (Default light/dark)
│   └── type.html        ← IBM Plex Mono (UI) + Manrope (display), scale, kicker, tnum
└── components/
    ├── bottom-nav.html  ← 4 tabs, exact SVGs, active = brand, pending pulse
    ├── motion-row.html  ← paper-list row, 20px checkbox, ombré fill, done state
    ├── swell-row.html   ← name + value + 4px tide bar
    └── daily-progress.html ← 5px header progress bar, ombré + brand fills
```

## Backlog (not yet built)

Tackled one at a time in future syncs: Swells compass surface, Anchors radar (canvas), celebration wave/foam/droplets, wave-sweep overlay, locked Anchors field (`WaveField`), cycle-close ceremony, add-entry keyboard pattern, skip affordance, theme cards for Bolinas + Biarritz.
