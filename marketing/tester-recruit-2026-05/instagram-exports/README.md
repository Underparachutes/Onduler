# Instagram carousel — ready-to-post exports

Three 1080×1350 PNGs in upload order. Post as a single carousel.

| File | What it is |
|---|---|
| `01-wake-hero.png` | Brand mark — wake floating in the wave field, headline, signup CTA |
| `02-personal-note.png` | "Hi — I'm Josh, I'm building Onduler" — the human hook |
| `03-motions-mockup.png` | Preview of the Motions page (daily checklist surface) |

## Heads-up: font fallback

These exports were rendered without the Manrope or IBM Plex Mono font files installed, so the typography falls back to system monospace/sans-serif. The layout is right; the fonts look slightly different from what you'd get with the proper fonts installed.

If you want pixel-perfect typography matching the brand:

1. Install **Manrope** from <https://fonts.google.com/specimen/Manrope> (download → unzip → double-click each `.ttf` → "Install Font" in Font Book)
2. Install **IBM Plex Mono** from <https://fonts.google.com/specimen/IBM+Plex+Mono> (same process)
3. Open the source `.svg` files in Chrome (drag onto a tab), right-click → "Save image as..." → save the resulting PNGs over the ones in this folder.

For tester-recruit posting, the fallback typography is fine — IG compresses everything anyway.

## Posting flow

1. **Set your IG bio link** to `https://onduler.app/signup?utm_source=instagram&utm_campaign=tester` before posting (the slides reference "link in bio").
2. **AirDrop** all three PNGs from your Mac to your phone in order: `01`, `02`, `03`. They'll appear in your Photos in that order.
3. In the Instagram app: tap **`+`** → **Post** → tap the **overlapping-squares icon** to enable multi-select → tap **01** first, then **02**, then **03**.
4. Tap **Next** → **Next** → paste the caption (from the `HANDOFF.md` "Suggested caption" block in the parent folder) → tap **Share**.
5. The instant the post is live, comment the first-comment text (from `HANDOFF.md`) on your own post — keeps the hashtags out of the main caption.

## Tracking

Both the bio link and the QR code on the postcard carry `utm_source` + `utm_campaign` parameters. You can see which channel converted in your Supabase signups table by filtering on those values.

## If you want to regenerate these PNGs

The source SVGs live one folder up:
- `../instagram-post-tester.svg` → `01-wake-hero.png`
- `../instagram-post-2-tester.svg` → `02-personal-note.png`
- `../instagram-post-3-tester.svg` → `03-motions-mockup.png`

Open each in Chrome, save as PNG, drop into this folder. Or ask me to re-render.
