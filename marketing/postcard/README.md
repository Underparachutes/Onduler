# Postcard templates

Print-ready templates for the postcard drop described in `docs/launch-plan.md`. Two SVGs at 4 × 6 in portrait, designed to match the locked Anchors aesthetic.

## Files

- `postcard-front-template.svg` — deep-ocean ground, layered WaveField wash, wake polygon (slot), QR (slot), Tolkien italic
- `postcard-back-template.svg` — cream stock, modest tagline, `onduler.app`

## Workflow

1. Open `postcard-front-template.svg` in Figma (or Affinity / Illustrator).
2. For each card in the print run, generate a wake with a unique seed:
   ```
   /api/wake-svg?seed=1&n=7&size=400&bg=transparent&download
   /api/wake-svg?seed=2&n=7&size=400&bg=transparent&download
   …
   /api/wake-svg?seed=50&n=7&size=400&bg=transparent&download
   ```
3. Drop each wake into the `WAKE_SLOT` group on the front, centered at (200, 200).
4. Replace `QR_SLOT` with the real `onduler.app` QR. Recommended generator: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://onduler.app?utm_source=postcard&format=svg`. Drop the resulting SVG into the cream patch, scaled to fit (~60 × 60 inside the 68 × 68 backing).
5. Export each finished card as a print-ready PDF at 4 × 6 in.
6. Send PDFs to Moo (variable-print SKU if doing unique-per-card) or to a local print shop.

## Bleed

Both templates render to the trim line. Before exporting for print, either extend the background rect ~12 units (0.12 in) beyond every edge, or rely on the printer's bleed setting if it offers one. The dark teal bg is uniform, so a printer that auto-bleeds based on edge color will handle it cleanly.

## Fonts

- **Manrope** (display — tagline, URL, optional Tolkien)
- **IBM Plex Mono italic** (currently the front uses Manrope italic for the Tolkien line; swap to Plex Mono italic to match the in-product Anchors page)

If the printer doesn't have these fonts, convert all text to outlines before exporting.

## Print specs (Moo 4 × 6 portrait)

Moo's standard postcard SKU is 6 × 4 landscape, not 4 × 6 portrait. Options:
- **Vistaprint** offers 4 × 6 portrait directly
- **Local print shop** (most Berkeley/Oakland shops can do any size)
- **Moo** — order landscape and rotate the design 90°; or order their large 5 × 7 SKU and trim down

## Iteration

This is v1. Decisions still open:
- Single seed vs N unique seeds across the print run
- Tolkien quote on/off
- Tagline placement (currently back only — could move to front under the wake)
- Stock choice (matte cream vs pure white)
