#!/usr/bin/env python3
"""
Build UTM-tagged postcard variants from postcard-landscape-front-print.svg.

For each utm_content tag (surf, climb), generates a new postcard SVG with the
QR replaced by one pointing at:
  https://onduler.app/signup?utm_source=postcard&utm_campaign=tester&utm_content=<tag>

Surrounding layout (wake, wordmark, wave field, bleed) is untouched.

Usage:
  python3 build-utm-variants.py
"""

import re
import segno
from pathlib import Path

HERE = Path(__file__).parent
SOURCE = HERE / 'postcard-landscape-front-print.svg'

# UTM tags to split the print run by. Each becomes its own postcard variant.
VARIANTS = ['surf', 'climb']


def build_qr_inner(url: str, fg: str = '#0b2330', bg: str = '#ffffff') -> str:
    """
    Render a QR for `url` as the inner content of a 424x424 viewport, matching
    the postcard's existing QR group layout. The outer <g id="QR" transform=...>
    wrapper stays unchanged so the QR keeps its postcard position.

    16-unit quiet zone matches the original (qrserver-generated) QR. Module
    size scales to fill the rest, so different URL lengths still occupy the
    full visual square inside the wake.
    """
    qr = segno.make(url, error='m')  # 'm' = ~15% error correction
    matrix = qr.matrix
    # IMPORTANT: use len(matrix), not qr.symbol_size().
    # symbol_size() bakes in a default 4-module border on each side, so it
    # returns (matrix_size + 8). Using it as the divisor undersizes modules
    # and leaves the QR clinging to the upper-left corner of its viewport.
    n = len(matrix)
    quiet = 16
    module = (424 - 2 * quiet) / n

    rects = []
    for row_idx, row in enumerate(matrix):
        for col_idx, on in enumerate(row):
            if not on:
                continue
            x = quiet + col_idx * module
            y = quiet + row_idx * module
            rects.append(
                f'M {x:.2f},{y:.2f} l {module:.2f},0 0,{module:.2f} -{module:.2f},0 z'
            )
    path_d = ' '.join(rects)

    return (
        f'<rect x="0" y="0" width="424" height="424" fill="{bg}"/>\n'
        f'        <path d="{path_d}" fill="{fg}"/>'
    )


def patch_svg_for_variant(svg: str, tag: str) -> str:
    """Swap the QR inner contents and the source-comment line for a tagged URL."""
    url = f'https://onduler.app/signup?utm_source=postcard&utm_campaign=tester&utm_content={tag}'
    inner = build_qr_inner(url)

    # Replace the inner contents of <g id="QR" ...>...</g>. The outer wrapper
    # (with transform) and the closing tag of QR_SLOT stay put.
    qr_pattern = re.compile(
        r'(<g id="QR"[^>]*>)\s*.*?\s*(</g>\s*</g>)',
        re.DOTALL
    )
    new_block = lambda m: f'{m.group(1)}\n        {inner}\n      {m.group(2)}'
    svg = qr_pattern.sub(new_block, svg, count=1)

    # Update the human-readable comments that document where the QR points,
    # so the file is self-explanatory if someone reopens it later.
    svg = svg.replace(
        'Real QR pointing to https://onduler.app/signup?utm_source=postcard&utm_campaign=tester',
        f'Real QR pointing to {url}'
    )
    svg = svg.replace(
        'Source: api.qrserver.com SVG (424×424 viewport, 16px quiet zone built in).',
        f'Source: segno (424×424 viewport, 16-unit quiet zone). utm_content={tag}.'
    )
    svg = svg.replace(
        'Scaled 0.1887× and translated to land at the 80×80 slot (260,160)-(340,240).',
        f'utm_content={tag} batch — print this run for the {tag} drop-off audience.'
    )

    return svg


def main():
    src = SOURCE.read_text()
    for tag in VARIANTS:
        out = HERE / f'postcard-landscape-front-print-{tag}.svg'
        out.write_text(patch_svg_for_variant(src, tag))
        print(f'wrote {out.name}')


if __name__ == '__main__':
    main()
