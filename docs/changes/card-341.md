# Card #341: Header: the logo goat comes alive

## What changed

- The header logo can now be an animated version of the logo. It is set with two new settings, `BRAND_LOGO_ANIMATED` and `BRAND_LOGO_ANIMATED_DARK` (dark mode). Both are off when not set, so shops without them keep the still logo.
- Baifo gets `public/brand/logo-alive.svg` and `logo-alive-dark.svg`: the logo as a small SVG (50–70 KB) with CSS animation. About every 9 seconds the goat blinks, flicks its ear and lifts its head a little, then rests. The sun floats gently and the wave sways. The "baifo" word stays still.
- The browser picks the animated file only when the visitor allows motion. With "reduce motion" it loads the normal still logo, and the SVG also stops its own animation then.
- Only the header uses it. Footer, sign-in pages and emails keep the still logo. The animated SVGs have the same size (902×320) as the still logos, so nothing moves on the page.

## Why

The chef wanted the little goat in the header to feel alive, calm and small, without a heavy video.

## How to set it up

Add to `.env` and to Vercel:

```env
BRAND_LOGO_ANIMATED=/brand/logo-alive.svg
BRAND_LOGO_ANIMATED_DARK=/brand/logo-alive-dark.svg
```

## How to test by hand

1. With the two settings, open any page and watch the header logo for 10 seconds: the goat blinks, flicks its ear and lifts its head, then rests. The word "baifo" does not move.
2. Switch between light and dark: each mode shows its own animated logo, with no jump.
3. Turn on "reduce motion" (OS setting or Chrome DevTools > Rendering > prefers-reduced-motion: reduce) and reload: the still logo shows.
4. Check at desktop, 375px and 320px: the logo keeps its size and spot, nothing overlaps.
5. Remove the settings: the header shows the still logo as before.

Tests: `tests/components/brand-logo.test.tsx`.
