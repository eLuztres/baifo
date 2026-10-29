# Card #234: Baifo stickers from the goat logo

## What changed

- `brand/print/stickers/goat.svg` and `goat-logo.svg`: the goat logo (and goat + "baifo") redrawn by hand as clean vectors over `public/brand/symbol.png` and `logo.png`. This also covers B6.6 (vector version of the logo).
- `brand/print/stickers/files/`: print-ready stickers, each as SVG and a 300 dpi PNG at real size, most also as a vector PDF:
  - round 50 mm, light and dark
  - logo 80 × 30 mm with rounded corners, light and dark
  - die-cut goat about 44 × 50 mm with a 3.5 mm white border, transparent around it (SVG and PNG only)
  - an A4 sheet with 9 round and 4 logo stickers and grey cut guides, for home printing
  - a one-color goat
- `brand/print/stickers/build.mjs` rebuilds all files from the two SVGs (Playwright for the PDFs, sharp for the PNGs). `README.md` there explains how.
- The website code is unchanged. `brand/print/` is not under `public/`, so the site never serves these files. The main README lists `brand/print/` as a shop-owned folder.

## Why

Chantal wants stickers with the Baifo goat. The existing PNG logos are too small to print sharp (symbol 800 × 947 px, about 7 cm at 300 dpi), so the goat needed a vector version first.

## How to test by hand

1. Open `brand/print/stickers/files/sheet-a4.pdf`: every sticker on one page, sharp when zoomed in.
2. Compare `goat.svg` with `public/brand/symbol.png` side by side: same shapes and colors (the mouth and nose are slightly simpler).
3. Open `sticker-diecut-50mm.png` on a dark background: an even white border, transparent outside it.
4. Optional: run `node brand/print/stickers/build.mjs` (see the README there for `CHROME_PATH`). The SVGs and PNGs come out byte-identical; the PDFs only differ in their timestamps.
5. Before ordering, ask the print shop whether they want bleed. The round and logo files are cut exactly at the edge, which is fine for the white ones but can leave a thin white rim on the dark ones if the cut is a bit off.
