# Baifo stickers

`goat.svg` and `goat-logo.svg` are the goat logo redrawn as clean vectors (traced by hand over `public/brand/symbol.png` and `logo.png`). Everything in `files/` is built from them:

| File | What | Size |
| :--- | :--- | :--- |
| `sticker-round-50mm` (+ `-dark`) | Round sticker, goat on white / on ink | 50 mm |
| `sticker-logo-80x30mm` (+ `-dark`) | Goat + "baifo", rounded corners | 80 × 30 mm |
| `sticker-diecut-50mm` | Goat cut to shape with a 3.5 mm white border, transparent around it (the print shop traces the cut line) | 44 × 50 mm |
| `sheet-a4` | 9 round + 4 logo stickers with grey cut guides, to print at home on A4 sticker paper | A4 |
| `goat-mono` | The goat in one color | 80 mm wide |

Send the print shop the `.pdf` (vector, sharp at any size) or the `.svg`. The `.png` files are 300 dpi at the real size.

Rebuild after changing the SVGs:

```shell
node brand/print/stickers/build.mjs
# if Playwright's Chromium isn't installed:
CHROME_PATH=~/.cache/ms-playwright/chromium-1169/chrome-linux/chrome node brand/print/stickers/build.mjs
```
