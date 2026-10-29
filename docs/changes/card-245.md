# Card #245: Jose as Corral host in El Cotillo

## What changed

- The 📍 place picker in the header now lists only the Corrals of the places the visitor picked (`components/shared/header/place-picker.tsx`).
  - One place picked: only that place's Corral.
  - Whole island (the default for a new visitor): every live place's Corral, in the places' order (Corralejo first).
  - A place that isn't live never shows its Corral.
- The link list updates right away when the visitor ticks or unticks a place in the drawer.
- New test: `tests/components/place-picker.test.tsx`.

No code is needed for the Cotillo Corral itself: Admin → Places already has a "Corral" form per place (host name, host photo, address, map position, opening hours, welcome text, translated into every language on save).

## Why

El Cotillo gets its own Corral with Jose as host. Before, the picker listed every live Corral even when the visitor had picked only one place, so a Corralejo visitor would also be sent to Cotillo. The shop doesn't use the visitor's location, so "their place" is the place they picked.

## Going live (live admin, by hand)

1. Admin → Places → El Cotillo: tick **Live**.
2. Click "Corral" and fill in host **Jose**, his photo, the address and map position, the opening hours and the welcome text (one language is enough, saving translates).
3. If `SERVICE_AREA=Corralejo` is still set in Vercel, the "only in Corralejo" notice above the header stays. Change or remove it once Cotillo is open.

## How to test by hand

1. Locally, set El Cotillo live and give it a Corral in Admin → Places.
2. Open `http://localhost:3000`, tap 📍 in the header.
3. Whole island: two Corral links, Corralejo first.
4. Untick Corralejo: only the Cotillo link. Tick Corralejo, untick Cotillo: only the Corralejo link.
5. Tap the Cotillo link: `/corral/el-cotillo` shows Jose, his photo, address, hours and the welcome text.
6. Repeat at 375px and 320px width: the drawer scrolls, nothing runs off the side.
