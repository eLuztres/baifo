# Card 348: La Culeta, the Baifo goat with the black bum

## What changed

- **Every goat picture redrawn as La Culeta:** the same goat, scene and pose, but her rump, tail and the tops of her hind legs are black, in a side or three-quarter view so it shows. Same file names and sizes, cut-outs stay transparent with their sticker edge.
  - Home slideshow `public/brand/hero/`: all pictures with the goat (tall and wide), and the Lobos cut-out `00-lobos-figure.webp` (scaled back onto its old spot, so it still stands on the sand).
  - `public/brand/goat/`: happy, reading, waving and scene.
  - The "Baifo is open!" offer picture `public/brand/offers/opening.jpg` (the party goat, in its line-art style).
- **Her name in the texts** that already talk about the goat, in all 5 `brand/messages/*.json`: the slideshow alt texts ("La Culeta reads the newspaper…", the Lobos one says who she is) and the arrow back home, `PULL_UP_HOME` ("Back to La Culeta").

## How it was made

Each picture was sent to the OpenAI image edit endpoint (`editImage` in `lib/studio/openai.mjs`, like the `baifo-art` skill) as its own reference, with the prompt "redraw this picture as faithfully as possible, change only the goat: her back end is black (#1E2A2F), side or three-quarter view, same activity". Results were resized to the old sizes and saved as WebP/JPEG.

## Not changed

- Head-only goats can't show a bum: the header logo goat (`logo-alive*.svg`), the loader / contact goat (`loader.png`), the logo and icons. The category ring has no goat (a windmill).
- `hero-goat*.jpg` (the old realistic goat, not shown) and the print stickers.

## How to check

Open `/` at desktop, 375 and 320 px, light and dark: the reading goat in front of Lobos has a black bum; wait 7 s for the next pictures. The "Baifo is open!" toast shows the party goat with a black bum.

On `/explore`, scroll to the top and pull up: the arrow back home reads "Back to La Culeta" (switch languages to see the other four). Screen readers read her name in the slideshow alt texts.
