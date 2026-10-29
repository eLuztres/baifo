# Card #297: Explore with a small category ring and Netflix-style rows

## What changed

- **Removed from `/explore`:** the text search field, the category picture next to the title, the row of chips (Everything, Products, Wanted, Services, categories) and the row of round category "stories" (`explore-search.tsx`, `explore-chips.tsx`, `explore-stories.tsx` and their tests are gone, plus the unused texts in all five languages).
- **No heading on Everything:** the page starts straight with the ring (the title "All listings" stays only for screen readers). With something chosen, one line holds a back arrow to everything (just the arrow on a phone) and the name.
- **No counts:** the page shows no number of listings anywhere (not by the title, the ring, the rows or "See all").
- **Small category ring** (`explore-ring.tsx`): the chosen item big in the middle with its name below, a little of the neighbours fading out at the sides. Swipe it or tap the arrows; it turns round at the end. Items: Everything, Today (`?hoy`), Ending soon (`?pronto`), Events (`?tipo=eventos`) and every category with listings. Today, Ending soon and Events only show when they have something.
- **Rows** (`explore-row.tsx`): without a choice, `/explore` shows rows that swipe sideways: Today, Ending soon, Events, then each category, up to 12 listings each, with "See all" and arrows on desktop hover. With a choice, the full grid as before.
- **Ending soon:** listings that go offline within `ENDING_SOON_DAYS` (new setting, default 3), soonest first. A listing's end is its submission's `expiresAt`, or the product's own `expiresAt` for admin services (`endsAt` on the feed listings).

## Why

The search didn't work well and opened the keyboard on phones, and the chips plus the stories took too much room. Browsing should be calm and simple, like Netflix.

## How to test by hand

1. Open `/explore`: rows of listings, each swipes sideways and has "See all". On desktop, hover a row to see its arrows.
2. Swipe the ring or tap its arrows: the chosen item grows in the middle, its name shows below, and the page switches to it. Past the last category comes Everything again.
3. `/explore` with nothing chosen has no title and no count above the ring. Choose a category: the header shows ← and the name on one line, no count; the grid shows its listings; at the end "Next category" leads on.
4. Today shows today's events, Ending soon listings ending within 3 days, Events all events. Old links `/explore?c=eventos` and `/category/<slug>` still work.
5. Check all of it at 375px and 320px.

The same flow runs as an end-to-end test: `npx playwright test e2e/explore.spec.ts` (ring first and no counts, arrows and swipe, the way back, "See all").
