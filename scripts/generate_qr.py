"""Generate the print-ready QR code for the guest booklet, fully offline.

Usage:
    uv run --with segno scripts/generate_qr.py https://mariage.tail1234.ts.net

Writes qr.svg, qr.png and qr.pdf into ./qr/ (override with --out). The code is
static: it encodes the URL directly, so it never expires and no third party
sees it. Give the printer the SVG or PDF; the PNG is for previews.
"""

import argparse
from pathlib import Path
from urllib.parse import urlparse

import segno

# L=7%, M=15%, Q=25%, H=30% of damage recoverable. Use H if adding a logo.
ERROR_LEVELS = ("L", "M", "Q", "H")
QUIET_ZONE = 4  # modules of white border required by the QR spec; don't crop it


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("url", help="final public URL, e.g. https://mariage.tail1234.ts.net")
    parser.add_argument("--out", type=Path, default=Path("qr"), help="output directory")
    parser.add_argument("--error", choices=ERROR_LEVELS, default="Q", help="error correction level")
    parser.add_argument("--name", default="qr", help="output file basename")
    args = parser.parse_args()

    parsed = urlparse(args.url)
    if parsed.scheme != "https" or not parsed.netloc:
        parser.error("URL must be a full https:// address (Funnel only serves HTTPS)")

    qr = segno.make(args.url, error=args.error, micro=False)
    args.out.mkdir(parents=True, exist_ok=True)

    svg, png, pdf = (args.out / f"{args.name}.{ext}" for ext in ("svg", "png", "pdf"))
    qr.save(svg, scale=10, border=QUIET_ZONE)
    qr.save(png, scale=30, border=QUIET_ZONE)  # ~1000px wide
    qr.save(pdf, scale=10, border=QUIET_ZONE)

    modules = qr.symbol_size(border=0)[0]
    print(f"URL:      {args.url}")
    print(f"Version:  {qr.version} ({modules}x{modules} modules), error level {qr.error}")
    print(f"Written:  {svg}, {png}, {pdf}")
    print("Print at 2.5 cm square or larger, keep the white border, and scan a printed")
    print("proof with an iPhone and an Android phone before printing the booklet.")


if __name__ == "__main__":
    main()
