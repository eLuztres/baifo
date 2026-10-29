# Card #298: Home hero, title and buttons free on the picture

## What changed

- **No box:** the dark rounded panel behind the hero title and buttons (`components/shared/home/scene-hero.tsx`, from #288) is gone. The text stands directly on the picture at the top left, where every slide in `public/brand/hero` has open sky.
- **Title:** display font, white, larger (up to 3rem) and bold, with a soft text shadow. A faint radial shade sits only behind the words and fades out before the goat.
- **Buttons:** "Read the paper" is a solid turquoise pill with a small newspaper icon and a soft drop shadow. "Browse categories" is a frosted-glass pill with a white outline.
- **"Advertise from €5":** the pill at the bottom uses the same frosted-glass look, so all three match.
- Texts are unchanged, so no i18n keys were added.

## Why

The chef found the dark box heavy. The words and buttons should sit on the picture by themselves and stay readable on light and dark slides.

## Notes

- The text and glass pills use fixed white and soft black instead of theme tokens: every hero picture is bright, so `--foreground` would turn the title dark in light theme. This is the "overlays on photos" exception in `AGENTS.md`.

## How to test by hand

1. Open `/` at 1280–1920px wide and wait for a few slides to cross-fade: the title and buttons stay readable and never cover a goat's face.
2. Switch to dark theme: same check.
3. At 375px the two buttons share the width. At 320px they stack.
4. Hover "Browse categories" and "Advertise from €5": the glass gets a bit darker, the text stays white. Tab through them: the focus ring shows.
