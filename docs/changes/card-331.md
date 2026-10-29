# Card #331: Explore category page names the choice once, with a clear way back

## What changed

- `/explore` with a choice (`?hoy`, `?pronto`, `?tipo=eventos`, `?c=…`) no longer shows the big title and the small "‹ Todo" link. The `h1` stays, visually hidden, for screen readers and SEO.
- The chosen one is named only under the ring's highlighted middle circle.
- A round "←" back button with "Todo" under it (same size as the ring's arrows) sits at the left of the ring and goes back to `/explore`. The small "↑" home arrow (pull up to home, from `main`) stays first in the row, before it.
- The name under the ring wraps to two lines instead of being cut off, since the ring has less room beside both buttons.
- On a choice the ring leaves out its own "Todo" item, so going back exists only once; turning the ring goes round the choices only. On `/explore` itself nothing changed.
- The small "↑" pull-up-home arrow from `main` stays first in the row, before the back button. With both in the row the ring is narrower, so the name under it wraps to two lines instead of being cut off.

## Why

The category name showed twice (title and ring label) and the tiny "‹ Todo" link was easy to miss.

## How to test by hand

1. Open `/explore` and turn the ring to "Eventos" (or open a row's "see all"): the name "Eventos" shows once, under the ring; there is no big title.
2. A round "←" with "Todo" is at the left of the ring; it takes you back to `/explore`, where the ring starts with its grid "Todo" item again and no back button shows.
3. On a choice, the ring's arrows go round the choices and never land on "Todo".
4. Check at 1920px, a laptop, 375px and 320px, in light and dark, and in each language ("Todo", "Everything", "Alles", "Tout", "Tutto"): nothing overlaps or runs off the side, and a long name ("Children and elderly care") reads in full on two lines.

Tests: `tests/components/explore-ring.test.tsx` and `e2e/explore.spec.ts`.
