# Card 349: Explore, the categories turn on one round wheel

## What changed

- **One round wheel** (`components/shared/explore-ring.tsx`) replaces the old scrolling row at the top of `/explore`. Every choice, "Everything" included, sits evenly spaced on a thin oval track seen a little from above. The one in front is centered, biggest, has the primary border and its name underneath; the others get smaller, fainter and higher towards the back, the same on both sides.
- **Turning:** swipe or drag, sideways scrolling (trackpad left/right, Shift + mouse wheel), the arrow keys, the two small ‹ › arrows right beside it, or a tap on any circle (it takes the shortest way round). Scrolling up and down always scrolls the page, also over the wheel. With reduced motion it jumps straight there. The category opens once its circle is in front, so quick turns don't load every page on the way. The browser's back button turns the wheel too.
- **Smooth:** the circles follow the finger or mouse continuously; on release the wheel glides on with the drag's momentum and settles softly on the nearest circle (a spring without bounce). Quick taps and arrows flow into one running turn. Each frame only changes transform and opacity, written straight onto the circles without a React render, so it runs at 60 fps.
- **Simpler page** (`app/(root)/explore/page.tsx`): the separate "Everything" back link and the visible "↑" arrow are gone. Pulling up at the top of the page still goes home; the arrow stays only for screen readers.
- With many choices (Baifo has 22) about 7 are visible at once, the rest are hidden behind the ring. With 7 or fewer they spread wider.
- Theme tokens only (`bg-card`, `border-border`, `border-primary`, `text-muted-foreground`), so light and dark both work.

## Why

The old row had circles of different sizes, an empty side, a lonely "Everything" plus a back arrow, arrows far from the circles and a cut-off next circle. The chef wanted one calm, centered wheel.

## Tests

`tests/components/explore-ring.test.tsx`: every choice on the wheel with only the front one named, arrows turning round past the last back to "Everything" (and quick turns opening only the last one), tapping a circle, the arrow keys, up and down scrolling left to the page while sideways scrolling and Shift + mouse wheel turn the wheel (pinch zoom left alone), and the browser's back button turning the wheel without opening the page again.

A running turn checks the page that is open now, not the one it started on, so turning back to a circle right after a page change still opens it.

## How to check by hand

1. Open `/explore` on desktop (light and dark): the wheel is centered, "Everything" in front with its name under it.
2. Turn it by dragging (let go mid-drag: it glides on and settles), with a sideways trackpad scroll or Shift + mouse wheel, with ‹ ›, and with ← → after tabbing to the front circle. Each stop opens that category. Scroll down with the mouse over the wheel: the page scrolls to the listings and back up.
3. Tap a circle at the side: it turns to the front and opens.
4. Turn back to "Everything": the full list shows again. Use the browser's back button: the wheel follows.
5. At 375 and 320 px: nothing overflows sideways, swiping turns the wheel, swiping up and down still scrolls the page, and pulling down at the very top still goes home.
6. With reduced motion turned on, the wheel jumps without animating.
