# Card #303: the place picker names the chosen places

## What changed

- The 📍 button in the header (`components/shared/header/place-picker.tsx`) shows which places are chosen, in the island's order (not the order they were tapped):
  - One place: its name, "Corralejo".
  - Two places on tablet and desktop: both names, "Corralejo · El Cotillo".
  - Phones, or three or more places: the first name plus a count, "Corralejo +1". Names are never cut off.
  - "Whole island" only when every place is chosen, coming-soon places included.
- At 320px the menu button was pushed partly off the screen (already on main). On phones the header's gaps and the button's padding are smaller (`components/shared/header/index.tsx`), and below 360px the pin icon hides, so "Corralejo +1" and the menu button both fit.
- The button's screen-reader label always lists every chosen place.
- The drawer's select-all button says "Choose all" (`PLACES_CHOOSE_ALL`) instead of "Whole island". `PLACES_COUNT` ("2 places") is gone and `PLACES_FIRST_AND_MORE` is new, in all 5 languages.

## Why

With only Corralejo and El Cotillo live, picking both said "Whole island", although three more places are still to come.

## How to test by hand

1. Open the shop and tap 📍 in the header. Pick only Corralejo: the button says "Corralejo".
2. Add El Cotillo: on desktop the button says "Corralejo · El Cotillo", at 375 and 320px wide "Corralejo +1", next to the language and menu buttons without overlap, and the menu button fully visible at 320px.
3. Remove Corralejo, then tap "Choose all": same labels as step 2, never "Whole island" while a place is still "soon".
4. Switch the language: the labels and the "Choose all" button follow.
