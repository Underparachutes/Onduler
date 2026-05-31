#!/usr/bin/env python3
"""
Convert <text> elements in the postcard back SVG into <path> outlines using
IBM Plex Mono glyph data. Used because Moo's web preview (and many print
pipelines) don't have IBM Plex Mono installed and fall back to a generic
sans-serif. Baking text to paths guarantees identical rendering everywhere.

Usage:
  python3 text-to-paths.py INPUT.svg OUTPUT.svg

Targets the COPY group (the body paragraph). Leaves WORDMARK and FOOT alone
because Moo renders Manrope correctly in the preview.
"""

import sys, re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONT_DIR = '/sessions/modest-inspiring-babbage/mnt/onduler/.next/static/media/'
FONT_REGULAR = FONT_DIR + '99e609270109b47d-s.p.16-z~2sp29ex6.woff2'
FONT_SEMIBOLD = FONT_DIR + '23b7a97ae3b5c134-s.p.0o14nraug8u5s.woff2'


def load_font(path):
    ft = TTFont(path)
    return {
        'ttfont': ft,
        'cmap': ft.getBestCmap(),
        'glyphset': ft.getGlyphSet(),
        'units_per_em': ft['head'].unitsPerEm,
        'hmtx': ft['hmtx'],
    }


def text_to_path_d(font, text, font_size):
    """Render `text` as a single SVG path `d` string, baseline at (0, 0)."""
    scale = font_size / font['units_per_em']
    cursor_x = 0
    parts = []
    for ch in text:
        code = ord(ch)
        if code not in font['cmap']:
            # silently skip; Plex Mono should cover every char on the back
            continue
        glyph_name = font['cmap'][code]
        pen = SVGPathPen(font['glyphset'])
        font['glyphset'][glyph_name].draw(pen)
        d = pen.getCommands()
        if d:
            # translate to cursor and flip Y (font Y is up, SVG Y is down)
            parts.append(
                f'<path transform="translate({cursor_x:.3f} 0) '
                f'scale({scale:.6f} {-scale:.6f})" d="{d}"/>'
            )
        advance = font['hmtx'][glyph_name][0]
        cursor_x += advance * scale
    return parts, cursor_x


def convert_text_element(match, font_regular, font_semibold, default_font_size,
                          default_anchor, default_weight):
    """Convert one <text ...>...</text> match into a transformed <g> of paths."""
    full = match.group(0)
    attrs = match.group(1)
    content = match.group(2)

    def get_attr(name, default=None):
        m = re.search(rf'{name}\s*=\s*"([^"]*)"', attrs)
        return m.group(1) if m else default

    x = float(get_attr('x', '0'))
    y = float(get_attr('y', '0'))
    anchor = get_attr('text-anchor', default_anchor)
    font_size = float(get_attr('font-size', str(default_font_size)))
    weight = get_attr('font-weight', default_weight)

    font = font_semibold if weight in ('600', '700', 'bold', 'semibold') else font_regular

    parts, total_w = text_to_path_d(font, content, font_size)

    if anchor == 'middle':
        start_x = x - total_w / 2
    elif anchor == 'end':
        start_x = x - total_w
    else:
        start_x = x

    body = '\n  '.join(parts)
    return (f'<g transform="translate({start_x:.3f} {y:.3f})">\n  '
            f'{body}\n</g>')


def main():
    src, dst = sys.argv[1], sys.argv[2]
    svg = open(src, 'r').read()

    font_regular = load_font(FONT_REGULAR)
    font_semibold = load_font(FONT_SEMIBOLD)

    # Find the COPY group and convert every <text> inside it
    copy_match = re.search(
        r'(<g id="COPY"[^>]*>)(.*?)(</g>)',
        svg, re.DOTALL
    )
    if not copy_match:
        print('COPY group not found', file=sys.stderr)
        sys.exit(1)

    copy_open = copy_match.group(1)
    copy_body = copy_match.group(2)
    copy_close = copy_match.group(3)

    # Defaults from the group's attrs
    def grp_attr(name, default=None):
        m = re.search(rf'{name}\s*=\s*"([^"]*)"', copy_open)
        return m.group(1) if m else default

    default_font_size = float(grp_attr('font-size', '12'))
    default_anchor = grp_attr('text-anchor', 'start')

    def replace(m):
        return convert_text_element(
            m, font_regular, font_semibold,
            default_font_size, default_anchor, 'normal'
        )

    new_body = re.sub(
        r'<text([^>]*)>([^<]*)</text>',
        replace,
        copy_body
    )

    # Strip font-family from the group open tag since it no longer applies,
    # but keep fill so the paths inherit it.
    new_open = re.sub(r'\s*font-family="[^"]*"', '', copy_open)
    new_open = re.sub(r'\s*font-size="[^"]*"', '', new_open)
    new_open = re.sub(r'\s*text-anchor="[^"]*"', '', new_open)

    new_svg = (svg[:copy_match.start()]
               + new_open + new_body + copy_close
               + svg[copy_match.end():])

    open(dst, 'w').write(new_svg)
    print(f'wrote {dst}')


if __name__ == '__main__':
    main()
