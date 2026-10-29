# Card #341: Header: the logo goat comes alive

## What changed

- The header can show an animated mark with the wordmark beside it, as two separate pieces: `BRAND_LOGO_ANIMATED` (+ `_DARK`) for the mark, `BRAND_LOGO_WORDMARK` (+ `_DARK`) for the wordmark. Without a wordmark the shop name shows as text. All are off when unset, so other shops keep their still logo.
- Baifo: `public/brand/logo-alive.svg` and `logo-alive-dark.svg` are now only the goat (with its sun and waves), about 40–50 KB each. It floats gently on its waves, looks up to the sun, looks ahead, hops twice, flicks its ear and blinks, then rests (8-second loop). `wordmark.png` and `wordmark-dark.png` are the still "baifo" word.
- Both pieces sit in fixed-size boxes, so the header keeps its slim height on phones (goat 48px, word ~26px) and on desktop (goat 64px).
- "Reduce motion": the browser loads `logo-alive.svg#still`, which the SVG shows without animation.

## How to set it up

Add to `.env` and to Vercel (the first two are already there):

```env
BRAND_LOGO_ANIMATED=/brand/logo-alive.svg
BRAND_LOGO_ANIMATED_DARK=/brand/logo-alive-dark.svg
BRAND_LOGO_WORDMARK=/brand/wordmark.png
BRAND_LOGO_WORDMARK_DARK=/brand/wordmark-dark.png
```

## How to test by hand

1. Open the home page at 375px and 320px: the header is slim, the goat top left, then a gap, then "baifo", the menu button free on the right; the hero heading is not covered.
2. Watch the goat for 8 seconds: it looks up, looks ahead, hops twice, flicks its ear and blinks. The word does not move.
3. Switch light and dark: each shows its own goat and word.
4. Turn on "reduce motion" and reload: the goat stands still.
5. Without the settings the header shows the still logo as before.

Tests: `tests/components/brand-logo.test.tsx`.
