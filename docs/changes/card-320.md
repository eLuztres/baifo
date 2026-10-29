# Card #320: Wanted ad says when the budget range is wrong

## What changed

- `updateAdminListing` (`lib/marketplace/admin.actions.ts`) refuses to save a wanted ad whose "Hasta" is filled in but not above "Desde" (equal counts as wrong). It returns "Hasta tiene que ser más que Desde" and writes nothing.
- The editor already shows a failed save's message in the error line under the form, and the save bar says "No guardado", so the editor itself didn't change.
- An empty "Hasta" still saves as one amount, and products, services and events still never get a range.

## Why

The save used to say "Guardado" and quietly drop the range, so after a reload the admin's "Hasta" was gone without any hint why.

## How to test by hand

1. Open a wanted ad in `/admin/listings/<id>`.
2. Set Desde to 80 and Hasta to 50, then save: the message "Hasta tiene que ser más que Desde" shows under the form, and the save bar says it wasn't saved.
3. Set Hasta to 80 (the same as Desde): the same message.
4. Set Hasta to 120: it saves, and the range is still there after a reload.
5. Empty Hasta: it saves with just the one amount.
6. While the range is wrong, the actions that save first (like publishing) also stop with the message.
