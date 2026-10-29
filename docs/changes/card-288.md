# Card 288: Baifo home, artistic hero with changing goat backgrounds

## What changed

- **Merged** card 248 (the volcano baifo `public/brand/hero.jpg` and `HOME_HERO_IMAGE_ALT`) and card 268 (the scene hero with its crossfade, wording and the three versions in `docs/art/05-home`). The only conflicts were the texts: both sides' keys are kept.
- **One picture folder** `public/brand/hero/`: the slideshow is whatever sits there, in file name order (`components/shared/home/hero-pictures.ts`). `<name>.webp` is for phones, `<name>-wide.webp` for wider screens. `BRAND_HOME_SCENES` is gone; the six 268 scenes moved from `public/brand/home/` into the folder.
- **Rotation (10 on phones, 7 on wide screens):** newspaper, surf, dunes (`hero-goat-v1.jpg`, with a 3:2 crop for wide screens), kite, terrace (v2, phones only), camel, volcanoes (`goat/scene.webp`, phones only), windmill, dune (v1, phones only), hammock.
- **Left out:** `hero.jpg` (a real photo; it jumps out among the drawings, it stays as the plain hero's picture), `v3-beach` (the same scene as `newspaper`, in lower resolution), `hero-goat.jpg`, `hero-goat-v2.jpg`, `hero-goat-alt.jpg` (near copies of `hero-goat-v1`).
- **Feel:** 7 s per picture, 1.8 s crossfade, a very slow zoom/pan on every picture that never jumps back. With "reduce motion" only the first picture loads and nothing moves.
- **Loading:** next/image via `getImageProps` (art direction with `<picture>`), `sizes='100vw'`, the first picture with priority, each next one joins one step ahead.
- **Alt texts** `HOME_HERO_ALT_<NAME>` for every picture in all `brand/messages/*.json`. Only the picture in view is read out. They are Baifo's pictures, so the neutral `resources/*.json` don't get them; a picture without a text is decorative.

## Deploying

`BRAND_HOME_SCENES` can be removed from the Vercel environment variables (it does nothing now).

## How to check

1. Open `/` at desktop, 375 and 320 px, light and dark. The pictures change every 7 s with a soft fade, the title panel and buttons stay readable.
2. Turn on "reduce motion": the newspaper picture stays still.
3. Put a file that is no picture (e.g. `notes.txt`) in `public/brand/hero/`: it is skipped. Empty the folder: the old hero comes back.

## Review

- No bugs found. Added tests for `getHeroPictures` in a shop of its own: no folder means no slideshow, non-picture files are skipped, a wide-only picture is kept.
- Seen at 1280 px (light), 375 px (dark) and 320 px with reduce motion (one picture, no sideways scroll).
