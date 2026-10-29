# Card 285: Goat icons folder

## Why

The little waving comic goat of card 266 is Baifo's most recognizable picture. It becomes an icon set and the shop's app icon (the browser tab icon), replacing the old line-art goat.

## What changed

- **New folder `public/brand/icons/`**, square PNGs with transparency:
  - `goat-waving-512.png`, `goat-waving-192.png`, `goat-waving-64.png`: the waving goat.
  - `goat-badge-512.png`, `goat-badge-192.png`, `goat-badge-64.png`: the waving goat on a teal circle. It stays readable at 16–32px, where the plain goat is too fine.
  - `goat-happy-512.png`, `goat-reading-512.png`: the other two poses, stored for later (stickers, empty pages). No page uses them yet.
- **`public/brand/icon.png` is now the goat badge** (same file as `goat-badge-512.png`). `BRAND_ICON=/brand/icon.png` stays the same, so neither `.env` nor the Vercel settings change. The old icon is in git history.
- No code changes. The template (custom) doesn't change: these are Baifo's own pictures.

## How to check

- Open the shop and hard-reload (Ctrl+Shift+R): browsers cache the old favicon. The tab shows the goat on a teal circle.
- Open `/brand/icon.png` and `/brand/icons/goat-waving-512.png` in the browser: both load.
- `file public/brand/icons/*`: every file is square at the size in its name.
