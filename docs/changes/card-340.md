# Card #340: Few listings still look full

## What changed

- `/explore` ("Todo"): a row with fewer than 4 listings (`MIN_FULL_LISTINGS` in `lib/explore-rows.ts`) is no longer shown on its own with its own "Ver todo". Those listings go together, each once, in one grid titled "Más anuncios", or "Todos los anuncios" when no row is full. Rows with 4 or more listings look the same as before.
- A choice with fewer than 4 listings (a category, Hoy, Terminan pronto, Eventos) shows its own listings first, then a "Más anuncios" section with up to 12 other live listings.
- A grid with fewer than 4 tiles has no big tile, because a big one left an empty hole beside it.
- Home ring: "Ver todo en Electrónica (1)" only shows when the row under the ring doesn't already show every listing in that category.
- New text key `EXPLORE_MORE` in all languages.

## Why

With only a few listings, the pages showed a lonely card, "Ver todo" twice in a row and "Ver todo en …" for something already on screen. That looked broken.

## How to test by hand

1. With 1 or 3 live listings, open `/explore`: no row stands alone with one card, no "Ver todo" shows for thin rows, and each listing shows once in the mixed grid.
2. Open a category with one listing (`/explore?c=…`): its listing comes first, then "Más anuncios" with other listings, then the end section.
3. On the home page, turn the ring to a category with 1–2 listings: the "Ver todo en …" link is gone. On a category with more listings than its row shows, it's there.
4. With many listings, nothing changes: full rows with "Ver todo", a big tile in the grid.
5. Check at desktop, 375px and 320px.

Tests: `tests/lib/explore-rows.test.ts`.
