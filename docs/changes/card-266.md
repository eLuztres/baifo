# Card 266: Baifo art 3/5, the comic Baifo goat

## Why

Baifo wants a friendly mascot instead of the realistic goat on the volcano (card 248, dropped). The logo's goat becomes a cute comic kid goat that the Contact pop-up and the home page can use in both themes.

## What changed

- **New pictures in `public/brand/goat/`**, all 1152x1536 (3:4), WebP. They were made with the `baifo-art` skill of card 265 (2/5), with the logo and the waving goat as references so every pose shows the same goat:
  - `scene.webp`: the main picture. The goat on a sandy path between a Canarian cardón (left) and flowering tabaiba (right), with ochre volcano cones (one with a crater like Calderón Hondo), a strip of sea and the coral sun. The upper third is open sky, free for a headline.
  - `waving.webp`: waving hello (for the Contact pop-up, card 259).
  - `reading.webp`: reading the newspaper and peeking over it (for the home page, 5/5).
  - `happy.webp`: standing, happy/neutral.
- The three poses are **transparent cut-outs with a thin whitewash sticker edge**. Without that edge, the ink-coloured horns, hooves and outline disappear on the dark theme.
- **Character sheet** `docs/art/03-goat/sheet.webp`: the three poses on the light (top) and dark (bottom) background. `scene-preview.webp` is a small preview of the main picture.

## How it was made

From the repo root, using the skill on branch `card/265-…` (it is not on `main` yet):

1. `make-picture.mjs --cutout`: the waving goat (prompt "The goat waving hello" from `SKILL.md`, made a little funnier).
2. `--reference waving.png`: the reading and happy cut-outs and the scene (`--reference` without `--cutout`). The goat sentence stays the same in each, only the pose or setting changes.
3. The sticker edge: `magick <pose>.png \( +clone -alpha extract -morphology Dilate Disk:14 -blur 0x1.5 -background '#FAF7F0' -alpha shape \) +swap -background none -compose over -flatten <pose>-sticker.png`.

## How to check

- All files are 1152x1536 (3:4). The three poses have an alpha channel, the scene doesn't (`identify -format '%f %wx%h %[channels]\n' public/brand/goat/*.webp`).

- Open `docs/art/03-goat/sheet.webp` and `public/brand/goat/scene.webp`.
- No page uses the pictures yet. Cards 259 (Contact pop-up) and 268 (home, 5/5) use them.
