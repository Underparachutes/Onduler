# Free-floating bottom nav (detached pill)

*Brainstorm session 2026-06-05 (Cowork). Implementation in Claude Code.*

Make the mobile bottom nav a free-floating, detached pill (the new Instagram style) instead of a
full-width bar pinned flush to the screen edge. It floats above the content with an inset on all
sides, rounded fully, with a soft shadow.

**Sequencing note.** This is self-contained and low-dependency, but it has the highest iOS PWA
safe-area fiddle risk of the current batch (see Risk below). Build it *after* the photo-legibility
and Anchors changes land, so the pill can be tested floating over a background photo, which is the
interaction that makes the detached style pay off.

## Target look

- Pill, not bar: inset from the left, right, and bottom edges.
- Fully rounded (`rounded-full`).
- Raised surface color (`bg-th-surface`, not `bg-th-bg`) so it reads as floating above the page.
- Soft shadow for lift.
- No top border. The shadow and the gap do the separating work the border used to do.
- The photo (when a background image is active) shows through the gaps around the pill. That is the
  point: the nav stops looking stuck to the screen and starts looking like it sits on top of the
  composition.

## Implementation, `app/components/BottomNav.tsx`

Current: `<nav>` is `fixed bottom-0 left-0 right-0 z-40 border-t border-th-border bg-th-bg
md:hidden` with `paddingBottom: max(env(safe-area-inset-bottom), 0px)`, wrapping a
`mx-auto flex h-14 max-w-sm` inner row.

Move the visual treatment from the `<nav>` onto the inner row, and lift it off the edge:

- **`<nav>` becomes a transparent positioning layer:**
  - `fixed inset-x-0 z-40 md:hidden`
  - position the bottom with the safe area plus a float gap:
    `bottom-[calc(env(safe-area-inset-bottom)+0.5rem)]`
  - `pointer-events-none` so taps in the gaps around the pill pass through to content.
  - Drop `border-t`, drop `bg-th-bg`, drop the old `paddingBottom` style.
- **Inner row becomes the pill:**
  - `mx-auto flex h-14 max-w-sm items-center justify-around` (keep)
  - add horizontal inset on narrow screens: `mx-4` (so the pill never spans full width even below
    `max-w-sm`)
  - `rounded-full border border-th-border bg-th-surface shadow-lg`
  - `pointer-events-auto` (re-enable taps on the pill itself)
  - keep `px-2` and keep `transform: translate3d(0,0,0)` for iOS compositing stability.

Keep everything else as-is: the `NAV_ITEMS` map, active-route styling, the pending-anchor tide
pulse and dot, the per-item `rounded-lg` tap targets. The pill is purely a container restyle; the
item internals do not change.

## Layout math, `app/layout.tsx`

The body currently reserves space for a flush 3.5rem nav:

```
pb-[calc(3.5rem+env(safe-area-inset-bottom))]   // plus md:pb-0
```

The floating pill sits higher (it has a 0.5rem gap below it) and needs clearance above it so the
last row of content isn't tucked under the pill. Bump to roughly:

```
pb-[calc(4.5rem+env(safe-area-inset-bottom))]   // keep md:pb-0
```

(3.5rem pill height + ~1rem combined float gap and breathing room.) Tune the constant against a
real device so the last content row clears the pill with a comfortable margin. Per-page `pb-*`
values (DashboardView `pb-12`/`pb-44`, Anchors `pb-12`) stay; the body padding is the global
source of truth for nav clearance.

## SideNav (md+) is unaffected

`SideNav` already owns md+ and `BottomNav` is `md:hidden`. The pill is mobile-only. Do not restyle
the sidebar.

## Risk: iOS PWA safe area

PROJECT.md records a prior jitter bug: a sibling spacer `<div>` for the nav caused per-page jitter
on iOS PWA, fixed by collapsing to padding on the `<nav>` and `min-h-[100dvh]` on the body. Keep
that lesson:

- Do the safe-area handling in the pill's `bottom-[calc(...)]` offset, not via a spacer element.
- Keep `transform: translate3d(0,0,0)` on the pill.
- Leave `min-h-[100dvh]` on the body.
- Test route transitions on a real iOS PWA install (home, swells, anchors, settings) and confirm
  the pill doesn't jump when iOS chrome state shifts.

## Legibility interplay (amends the legibility spec)

`docs/specs/background-image-legibility.md` lists "Solid dark bottom nav" under "What's working
(do not touch)." The pill changes that anchor. It is still a solid surface (`bg-th-surface`), so it
holds its own contrast over a photo; it just floats now. Add a note to that line in the legibility
spec pointing here, so the two specs agree. The bottom gradient fade from legibility §5 still
applies to the photo zone; with a floating pill, the fade reads as the photo settling toward the
nav rather than a hard seam, which is consistent with the detached look.

## Acceptance

- Pill floats inset on all sides, fully rounded, with shadow, over both solid backgrounds and a
  background photo.
- Taps in the gaps around the pill reach content beneath; taps on the pill navigate.
- Last row of content on every page clears the pill.
- No jitter on iOS PWA route transitions.
- Active state, pending-anchor pulse, and dot all still render correctly inside the pill.

## Out of scope

- Translucent / frosted pill (backdrop-filter). Considered; higher iOS risk. The solid surface
  variant ships first; a frosted variant can be revisited if desired.
- Any change to `SideNav` or to the nav item set, icons, or routes.
- Hide-on-scroll or auto-collapsing nav behavior.
