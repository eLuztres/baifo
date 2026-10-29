# Card 289: Baifo home base, the reading goat in front of Lobos

## What changed

- **New first slideshow picture** `public/brand/hero/00-lobos.webp` (3:4, phones) and `00-lobos-wide.webp` (wider screens): Isla de Lobos seen from the beach at Corralejo, in the Baifo comic style. Its alt text is `HOME_HERO_ALT_LOBOS` in all `brand/messages/*.json`.
- **Cut-out figures:** `getHeroPictures()` now also picks up `<name>-figure.webp`, a transparent cut-out drawn over that picture. Lobos uses it for the reading goat (`00-lobos-figure.webp`), so the goat can move on its own. A figure without a picture is skipped.
- **Home base:** `SceneCrossfade` watches `useActiveSection()`. Away from the top the slideshow goes back to the first picture and stops, so scrolling or swiping back up always lands on the goat in front of Lobos. At the top the other pictures carry on every 7 s.
- **Welcome:** each time the visitor arrives at the top, the goat lowers the paper and looks up (1.6 s). With "reduce motion" it stays still.
- **Feed button:** a third button `HOME_SCENE_FEED` opens the newest listing, where swiping goes on to the next one. It only shows when `BRAND_SWIPE_TO_NEXT` is on, which it isn't for Baifo, so Baifo shows two buttons.

## Scroll flow (Joe's decision of 29 Oct)

- **Down from the goat → the newspaper.** On the home page, the wheel, Page Down/Space/Arrow Down and an upward swipe on the opening part open `/explore` instead of turning to the category ring (`OnePageScroller` `belowHomeHref`, set when the home uses the scene slideshow).
- **The ring only opens with "See the categories".** Scrolling up from it lands on the goat, as before. How it works and Contact stay below the ring and in the menu.
- **Up at the top of the newspaper → home.** `PullUpHome` (`components/shared/pull-up-home.tsx`) sits at the top of `/explore`: a small round ↑ arrow (label `PULL_UP_HOME` as its accessible name and tooltip) that fills from the bottom as you pull and is a plain link too. Joe found a pill on its own row too big on phones, so the arrow sits in an existing line: since #297, at the left of the category ring's line (see below). Only a pull that *starts* at the top counts: a wheel gesture that began below the top (reading upward) never triggers it. Touch: pull down 110 px at the top (replaces the bounce and pull-to-refresh). Keys: Page Up or Home at the top. A short pull lets go after 0.5 s.
- Listing pages keep their normal back.

## How to check

1. Open `/` at desktop, 375 and 320 px, light and dark. The first picture is the goat reading in front of Lobos. It sits on the sand above the advertise link and doesn't cover the buttons.
2. Wait 7 s: the next picture fades in. Scroll or swipe down: `/explore` opens. At its top, pull up once more: back on the goat, which looks up once.
3. Tap "See the categories", then scroll or swipe up: back on the goat. Reading upward to the top of `/explore` must not leave the page.
4. Turn on "reduce motion": the Lobos picture stays and the goat doesn't move.
5. With `BRAND_SWIPE_TO_NEXT=true` a third button appears and opens the newest listing.

## Review

- No bugs found in the code. Added a test that the cut-out is only drawn over the scene that has one, and is decorative (empty alt).
- README "Home slideshow" now explains `-figure` pictures and the rest-on-first-picture behaviour.
- Second review (scroll flow): leaving the home with a key only happens from the page itself or a focused link. Before, Space on a focused button (e.g. the header menu) or the arrows in an open menu opened `/explore` instead. Added `tests/components/one-page-scroller.test.tsx` for the "down from the goat → newspaper" flow (wheel once per gesture, keys, no leaving upward, old turning without `belowHomeHref`).
- Third review (small arrow): no bugs found. The arrow's text is its accessible name and tooltip, which the existing `pull-up-home` tests already look it up by. Checked at 320 and 375 px on "All listings" and inside a category: the arrow stays in the title's line, and nothing overlaps or is cut off.

## Rebuilt on the new explore page (#297)

- #297 replaced the explore page: no visible "All listings" title and no "Explore by category" line any more; the page starts with the small category ring.
- The ↑ arrow back to the goat now sits at the left of the ring's line, level with its circles, both on "Everything" and inside a category. No row of its own. Without a ring (one category or fewer) it shows on its own.

## Fourth review (on the new explore page)

- No bugs found. The arrow sits level with the ring's circles (4 rem on phones, 5 rem from `sm`). Lint is clean and all 616 tests pass.
- A pull that *starts on the ring* doesn't count, because the ring scrolls sideways (`isInsideSideMover`). Pull from below the ring, or tap the arrow.
