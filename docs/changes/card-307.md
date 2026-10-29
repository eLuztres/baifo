# Card #307: Category ring, the island in the middle and fully visible on phones

## What changed

Only `components/shared/product/product-ring.module.css` (the `.pieceStage` rules, and the category cards on big screens):

- **Seen from higher up:** the ring tilts more (`--tilt: -34deg`) and stands at the foot of its stage, so the island (`BRAND_RING_CENTER`) floats whole above the front card, with the sea, boats and gulls around it.
- **Fits one screen:** the stage's height is `min(card width × 2.2, 100svh − 22rem)`, the room the rings' row and the text below leave, so the whole section still fits one phone screen (#139, #158).
- **Thin top fade:** the fade at the stage's top is 4% instead of 22%, so it no longer hides the island's tip.
- **The island is the hero on phones (Joe's feedback "bigger in the center"):** the ring's cards are a bit smaller on phones (`--card-w: min(44vw, 24svh)`, still readable) and the island bigger (`--piece-scale: 1.25`), so it fills the middle of the screen with its sky and gulls.
- **Short phones (≤700px tall):** a slightly smaller island (`1.05`), so its top stays in view.
- **Narrow phones (<360px):** the ring stands a little higher, so a two-line front name stays above the stage's foot.
- **Very short phones (501–600px tall, e.g. 320×568):** the cards shrink a little (`--card-w: min(50vw, 21svh)`), the ring rises and the island is smaller, so it shows whole above the front card and a two-line front name ("Home and furniture") stays above the stage's foot. Added in review: before this, the island was cut off at the top and mostly hidden there.
- **Any number of categories:** seen this steeply, the front card drops below the ring's middle by about half the radius, and the radius grows with the number of categories (with 19 the cards fell below the stage and vanished). On phones the cards are lifted by that drop and the island keeps one depth (1.3 card widths), so both stay put however many categories a shop has.
- **Sideways (≤500px tall):** the stage keeps a fixed height, since the page scrolls there anyway.
- **Front card 4:5 (Joe's feedback):** the front card grows upward to Instagram's portrait 4:5 (`top: -card-w / 4`) instead of the full 3:4, so it covers less of the ring's middle; the picture is cropped to fill it. Phones keep their square front card.
- **Desktop (≥1024px):** the island is smaller (`--piece-scale: 1.15`) and floats higher (`--piece-lift: -0.58`), so it shows above the front card. At 1440×900 the header can still touch its northern tip.
- **Laptops (≥1024px wide, ≤800px tall):** slightly smaller cards (`min(29vw, 27svh)`), a front card that grows less (`scale: 1.15`) and a smaller, lower island (`1`, `-0.4`), so the island fits whole between the header and the front card.
- **Clean circle (Joe's request):** on big screens the cards beside the front one get smaller and dimmer step by step with their angle (`--depth`, the cosine of it), so no outer card looks bigger than an inner one; they fade toward the page background, so it works in light and dark. All cards have the front card's 4:5 shape, and the cards no longer float up and down (that made the heights look random). Sizes and dimming follow the turn.

## Why

On phones the island in the ring's middle was almost hidden behind the front card and the top fade. The chef wants to see it whole, near the middle of the screen, with the birds and sky around it.

## Notes

- Contrast was checked in dark and light mode: the sand-coloured island stands out on the teal sea, so no colours changed.
- The island sits in the upper half of the screen rather than the exact centre. Lower would push the rings' row below the fold.

- The relayed clean-circle note asked for 3:4 cards; Joe's own words just before asked for Instagram's 4:5, so all cards are 4:5.

## How to test by hand

1. Open `/` at 375×667 and 375×812, scroll to the category ring: the island shows whole above the front card, gulls and boats around it.
2. With many categories (the dev database had 19): the front card and its name still sit inside the stage.
3. Turn the ring with the arrows a few times: the island turns with it and stays in view.
4. Repeat at 320×568: the island is smaller but whole, and "Home and furniture" (two lines) is fully readable above the rings' row.
5. Hold a phone sideways: the page scrolls and the ring keeps its own height.
6. At 1440×900 and 1920×1080: the front card is 4:5 and the island shows above it, with gulls and boats; the side cards shrink and dim evenly, mirrored left and right.
7. At 1280×720 and 1366×768: the island fits whole between the header and the front card, and the front name with its "New" line is readable.
