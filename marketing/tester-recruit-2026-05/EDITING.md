# Editing the postcard + Instagram files

These are all `.svg` files — plain text. Open them in any text editor (TextEdit, VS Code, Sublime) or in Figma / Affinity / Illustrator for visual editing. Text edits are usually faster than opening Figma.

## The five files

| File | What it is |
|---|---|
| `postcard-landscape-front.svg` | Postcard front — wake + QR + ONDULER wordmark, deep ocean ground |
| `postcard-landscape-back.svg` | Postcard back — cream stock, centered paragraph |
| `instagram-post-tester.svg` | IG carousel slide 1 — wake + headline + signup pill |
| `instagram-post-2-tester.svg` | IG carousel slide 2 — cream, personal note from Josh |
| `instagram-post-3-tester.svg` | IG carousel slide 3 — mock of the Motions page |

## How an SVG is organized

Every file is split into named **groups** (`<g id="SOMETHING">`). When you want to change something, find the group with the matching name. Each group holds a few `<text>` or `<path>` lines.

The group names you'll see:

- `BACKGROUND` — the colored card or canvas underneath everything
- `WAVEFIELD` — the stacked sine waves on the deep-ocean files
- `WORDMARK` — the small "ONDULER" text
- `WAKE` — the 7-sided wake polygon
- `QR` — the QR code inside the wake (postcard front only)
- `INVITATION` / `HEADLINE` / `MESSAGE` / `COPY` — the body text
- `CTA` — the cream-on-dark signup pill (IG slide 1 only)
- `FOOT` / `URL` — the bottom line with `onduler.app/signup` + tagline
- `NAV` — the bottom navigation on IG slide 3

## How a `<text>` line is built

Every text element looks roughly like this:

```xml
<text x="540" y="155"
      text-anchor="middle"
      font-family="Manrope, ui-sans-serif, system-ui, sans-serif"
      font-size="38"
      font-weight="600"
      letter-spacing="0.28em"
      fill="#ede4cc"
      opacity="0.94">ONDULER</text>
```

What each attribute does:

| Attribute | Controls |
|---|---|
| `x`, `y` | Position. `x` is horizontal, `y` is vertical (counting **down** from the top). |
| `text-anchor="middle"` | Means `x` is the center of the text. If this attribute is missing, `x` is the left edge. `end` means `x` is the right edge. |
| `font-family` | The font. The first name (e.g. `Manrope`) is used if installed; the rest are fallbacks. |
| `font-size` | Text size, in viewBox units. |
| `font-weight` | `400` = normal, `500` = medium, `600` = semibold, `700` = bold. |
| `letter-spacing` | Space between letters. `0.10em` is tight; `0.30em` is very wide (logo-style). |
| `fill` | Color of the text. Hex like `#ede4cc` (cream), `#1c2333` (deep navy), `#F67E4E` (coral). |
| `opacity` | `1` is fully visible; `0.5` is half-transparent; `0` is invisible. |
| The text between `>...</text>` | The actual words shown on the card. |

## Common edits

### Change the wording

Search for the exact phrase you want to change. Edit only the text between `>` and `</text>`. Don't touch any of the attributes.

Example — to change the IG headline:

Find this in `instagram-post-tester.svg`:
```xml
opacity="0.98">First wave of testers</text>
```

Change to:
```xml
opacity="0.98">New batch of testers</text>
```

### Change a font

Find the `font-family` attribute and replace the first name. The two fonts already in use are **Manrope** (display / sans-serif) and **IBM Plex Mono** (monospace). If you want something else installed locally, type its name first, e.g.:

```xml
font-family="Georgia, serif"
```

Use `find and replace all` in your editor if you want to swap fonts everywhere in a file at once.

### Change a color

Search the file for the hex code you want to replace (e.g. `#ede4cc` for the cream). Replace with the new hex.

The brand palette in use across these files:

| Hex | What it is | Used for |
|---|---|---|
| `#0b2330` | Deep ocean | Postcard front BG, IG slide 1 + 3 BG |
| `#ede4cc` | Cream | All text on dark backgrounds, wake outline |
| `#f5efe2` | Pale cream | Postcard back BG, IG slide 2 BG |
| `#1c2333` | Deep navy | All text on cream backgrounds |
| `#F67E4E` | Coral | The "Every motion leaves a wake" tagline |
| `#ffffff` | Pure white | Filled wake on postcard front |

### Make text bigger or smaller

Change the `font-size` number. The viewBox of each file is the coordinate space:

- Postcards: `viewBox="0 0 600 400"` — `font-size="20"` is roughly 5% of the postcard width
- IG slides: `viewBox="0 0 1080 1350"` — `font-size="38"` is roughly 3.5% of the canvas width

If you bump a font size up, you may need to adjust the `y` value to keep it from overlapping things above or below it.

### Move something

Change the `x` and `y` values. Remember:

- `x` higher → moves **right**
- `y` higher → moves **down**

For the postcard's QR specifically, see the QR-position section below.

### Reposition the QR (postcard front)

Find this line (around line 157 of `postcard-landscape-front.svg`):

```xml
<g id="QR" transform="translate(229 125) scale(0.358490566)">
```

- The two numbers in `translate(X Y)` set the QR's top-left corner.
- The scale (currently 0.358) sizes the QR. Bigger number = bigger QR.
- The QR is 152×152 at the current scale, so its center sits at `(X + 76, Y + 76)`.

To shift the QR 10 units left, change `translate(229 125)` to `translate(219 125)`.

To make the QR bigger and re-center it on the same spot, increase the scale and shift the translate by half the size increase in both X and Y. For example, scale 0.42 makes the QR 178 wide — you'd shift translate by `-(178-152)/2 = -13` in both directions, so `translate(216 112)`.

## Re-rendering after editing

If you're editing in a text editor, you won't see the result until you open the SVG in a browser or design tool.

- **Quickest preview**: drag the `.svg` file onto a browser tab.
- **Figma / Affinity / Illustrator**: File → Open or drag the file in. The named groups (`WAKE`, `WORDMARK`, etc.) show up in the layers panel.
- **Re-export for print or IG**: Figma → Export the artboard as PNG (for IG) or PDF (for postcard print).

## When you might want me to do it instead

- Generating a new QR for a different URL
- Picking a more balanced wake shape
- Re-doing the wave field math (changing density, opacity, taper)
- Replacing the slide 3 mockup with a real screenshot from your phone

For everything else — copy edits, color tweaks, font swaps, repositioning — the text editor is faster than asking me.
