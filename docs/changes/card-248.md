# Card 248: little baifo on the volcano, on the home page

## What changed

- `public/brand/hero.jpg` is now a 3:4 portrait (1152×1536) of a baifo, a Majorera kid, nibbling a tabaiba on a red-brown volcanic slope, with dunes and sea behind it. It replaces the old 1024×1024 hero picture. `BRAND_HERO_IMAGE=/brand/hero.jpg` stays the same, so no `.env` change is needed.
- `components/shared/home/dark-room-hero.tsx`: the hero picture's `alt` comes from the new `HOME_HERO_IMAGE_ALT` key and is no longer hardcoded as `''`.
- `resources/*.json`: `HOME_HERO_IMAGE_ALT` is `""` in every language, so the picture stays decorative for shops that don't set the key.
- `brand/messages/*.json` (es, en, it, fr, de): Baifo describes the picture, e.g. "Un baifo, una cabrita majorera, mordisquea una tabaiba en un volcán de Fuerteventura".
- `README.md` (Home page): how to give the hero picture an alt text.

## Why

The opening of the home page should feel welcoming and of the island. The picture now has a real description because it shows something, not just decoration.

## How to test by hand

1. Run `npm run dev` with `BRAND_HERO_IMAGE=/brand/hero.jpg` and open `http://localhost:3000`.
2. Desktop: the baifo sits next to the hero text, fading into the background at the edges. The text and the WhatsApp block are not pushed down.
3. At 375px and 320px: the picture sits above the text (at most 22rem high). Nothing overlaps or runs off the side.
4. Light and dark theme: the fade looks right in both.
5. Inspect the `<img>`: its `alt` matches the current language (switch es / en / it / fr / de).

## Notes

- The hero box is square (`aspect-ratio: 1`, `object-fit: cover`), so the 3:4 picture is cropped a little at the top and bottom. The goat sits in the middle and stays fully visible. The CSS was left unchanged to keep this ticket to one change.
- `showroom-section.tsx` uses `BRAND.heroImage` as the cover for a category with no cover and no products. Such a category now shows the baifo.
- No looping video version was made (optional in the card).
