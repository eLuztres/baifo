# Card #310: New listing steps, just 1 and 2 with the current one in focus

## What changed

- **No check mark:** the step bar in `components/marketplace/listing-steps.tsx` always shows the numbers **1** and **2**. The ✓ on "Photos" after moving on is gone.
- **Focus on the current step:** filled circle in the primary color with a bold number and a bold label. The other step has an outline circle and a muted label.
- **Line between the steps:** always the calm border color. It used to turn primary once you passed it, which showed progress.
- Both steps stay tappable to jump between them, as in #296/#276. No new texts, so no i18n keys.

## Why

"Photos ✓" showed as soon as you opened the description, even with no photos. The steps are free to switch, so there is no "done" state to show.

## How to test by hand

1. Open "New listing": step 1 "Photos" is filled and bold, step 2 is an outline with a muted label.
2. Tap "Description": now 2 is filled and 1 is an outline with the number 1, no ✓.
3. Tap "Photos" to jump back.
4. Check light and dark theme, and 375px and 320px width: nothing overlaps or gets cut off.

## Follow-up: the admin menu stays on "New listing"

- **Problem:** after "Photos", the listing gets its own page (`/admin/listings/<id>`), and the menu lit "Listings" instead of "New listing".
- **Fix:** the new-listing form opens that page with `?nuevo=1` (`CREATING_PARAM` in `lib/constants`). `app/admin/main-nav.tsx` keeps "New listing" lit while that is in the address, and "Listings" stays off. A listing opened from the list has no `?nuevo`, so "Listings" is lit there as before.
- **Tests:** `tests/components/main-nav.test.tsx`.

### How to test by hand

1. Open "New listing" and tap "Description", then "Photos", then "Description" again: "New listing" stays lit in the menu (bar on desktop, pill on the phone).
2. Open a listing from "Listings": "Listings" is lit.
