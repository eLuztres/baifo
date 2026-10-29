# Card 344: Top bar hides when scrolling down, comes back on a small swipe up

## What changed

- **New `HidingHeader`** (`components/shared/header/hiding-header.tsx`): a client wrapper around the sticky header. Scrolling down slides the bar up out of view (0.2 s, `translate`, so nothing on the page moves). A scroll up of more than 8 px brings it back straight away. The 8 px stops a shaky finger from making it flicker.
- **Always shown** at the top of the page (within the bar's own height), while one of its menus or the place picker is open (`aria-expanded="true"` inside it), and while something in it has keyboard focus. Tabbing into the bar shows it.
- **Reduce motion:** the slide is `motion-safe` only, so the bar just appears and disappears.
- `components/shared/header/index.tsx` uses `HidingHeader` instead of the plain `<header>`. Its classes are unchanged.

## Why

Joe wants more room for the page, like Instagram or Safari: the bar gets out of the way while reading and comes back on a small swipe up.

## Where it works

- It listens to the window's scroll, so it acts on pages that scroll normally: the newspaper (`/explore`), category pages, account and cart pages.
- **Home (with the category ring) and listing pages keep the bar.** Home scrolls inside its own one-page scroller, whose screens are sized to sit exactly under the bar, and a listing page doesn't scroll. The "pull up at the top → home" gesture (#289) is untouched, because the bar is always shown at the top.

## How to check

1. Open `/explore` at desktop, 375 and 320 px. Scroll down: the bar slides away and the listings use the whole screen.
2. Swipe up a little: the bar comes back at once. Scroll down again: it hides again. Scroll back to the top: it stays.
3. Scroll down, then open a listing: the listing page shows the bar.
4. Open the place picker or the menu and scroll the page behind it: the bar stays.
5. Press Tab while the bar is hidden: it comes back with the focused link.
6. Turn on "reduce motion": the bar appears and disappears without sliding.

## Review

- No bugs found. Checked with Playwright at 1280, 375 and 320 px: hides on scroll down, returns on a 60 px scroll up, shown at the top, and shown again after opening a listing from a scrolled newspaper.
- The existing `tests/components/hiding-header.test.tsx` covers hide/show, jitter, the top of the page, an open menu and focus. Lint is clean and all 692 tests pass.
