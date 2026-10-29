# Card #343: Listing page on the phone: big picture, small back button

## What changed

- Phones only (under 640px); tablets and desktop look the same as before.
- The picture sits right under the header, full width and edge to edge, in 3:4 (`components/shared/product/product-images.tsx`).
- With 2+ pictures you swipe sideways between them (CSS scroll snap); small dots at the bottom show which one is on screen. One picture shows no dots. A tap still opens the picture full screen.
- The "Volver a los anuncios" row is hidden on phones. A small round "‹" button floats on the picture's top left, on a soft see-through background, and goes back to the listings (`app/(root)/product/[slug]/page.tsx`).
- On phones the page now scrolls below the picture (it was one fixed screen). A long description is capped at about 6 lines with the existing "more" arrow, so Contact is one short scroll away (`product-view.module.css`).
- Swipe-up-to-next-listing (`BRAND.hasSwipeToNext`) on phones only turns on once the page is scrolled to the bottom (`next-ring-swipe.tsx`).
- New tests in `tests/components/product-images.test.tsx`: one dot per picture, the dot follows the swipe, no dots for one picture.

## Why

On phones the picture was small, and the back link took a whole row.

## How to test by hand

1. Open a listing with 2 pictures at 375px width: the picture fills the width under the header, with "‹" on the top left and two dots at the bottom.
2. Swipe sideways: the second picture snaps in and the second dot lights up. Tap it: it opens full screen.
3. Scroll down a little to the title, price and Contact. Tap "‹": you're back on the listings.
4. Open a listing with 1 picture: same big picture, no dots.
5. Repeat at 320px and 375×667, in light and dark: nothing overlaps or runs off the side.
6. On desktop the page looks as before, with the "Volver a los anuncios" link.
