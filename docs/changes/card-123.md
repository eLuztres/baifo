# Card #123: Smooth browsing on the feed

## What changed

- **Search as you type** on `/explore`: the feed filters about a third of a second after the last key (`?q=…`). A cross in the field clears it and brings the whole feed back. The "Buscar" button is gone; Enter still searches and closes the phone keyboard.
- **One row of chips instead of the two dropdown menus** (`explore-chips.tsx` replaces `explore-filter-menu.tsx`): Todo, Hoy (only when something happens today), Productos / Busco / Servicios / Eventos, then the categories. It swipes sideways on a phone.
  - **Todo** clears category, type, Hoy and the search in one tap.
  - A chosen chip is filled with a small ×; tapping it again drops just that filter and keeps the others and the search.
  - Chosen chips move right after Todo, so they're visible on a phone without swiping.
- **No dead end:** when a search inside a category or type finds nothing, "Buscar «…» en todo" runs the same words over everything.
- Subcategories have no chip of their own anymore (fewer filters). Old `?sub=` links still open them.
- Texts: `EXPLORE_SEARCH_EVERYWHERE` added; `CATEGORY_ALL`, `EXPLORE_CATEGORY_BUTTON` and `EXPLORE_SEARCH_SUBMIT` removed, in all five languages.
- Review fixes: the search no longer uses `URLSearchParams.size` (missing in iOS 16 Safari and jsdom, where every query was dropped), and a chip tapped during the typing pause is no longer undone when the pending search fires. After a tap the chip row starts at the left again, so on a phone "Todo" and the chosen chip are in sight instead of the row staying swiped.

## Why

Joe felt stuck inside a category and found the filters too technical. A feed app works with one field and a few plain chips: what's active is always in sight and one tap undoes it.

## How to test by hand

1. Open `http://localhost:3000/explore` and type "bici" slowly: the feed updates by itself, a spinner shows in the field while it loads, the letters you type are never undone.
2. Tap the ×: the field empties and the whole feed is back.
3. Tap a category, then a type: both chips are filled and sit right after Todo. Tap one of them again: only that one goes away.
4. Inside a category, search for something that's only elsewhere (or "xyzzy"): the empty state offers "Buscar «…» en todo" and "Borrar búsqueda".
5. Tap Todo: category, type and search are all cleared.
6. With Hoy chosen, search: the address keeps `?hoy` (no `hoy=`).
7. Choose another town in the place filter: search and chips only show that town's listings.
8. Check at 375px and 320px: the chip row swipes, nothing overlaps or runs off the side.
