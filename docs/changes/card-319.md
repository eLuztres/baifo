# Card #319: Wanted ad, budget "up to X" only

## What changed

- **Saving (`updateAdminListing`):** a wanted ad (`WANTED`) saves with an empty "Desde" as long as "Hasta" is filled in. Clearing "Desde" on a wanted ad now really clears it (before, the old value stayed). An item for sale still needs a price, and a wanted ad with both fields empty still doesn't save.
- **Storage:** the draft keeps "Desde" empty (`null`), the live product gets `0`, as for a service without a "from" price. No migration.
- **Display:** new text `WANTED_BUDGET_UP_TO` ("Presupuesto hasta", "Budget up to", …) in all five languages, picked by `wantedBudgetKey` in `lib/listing-labels.ts`. Used on the listing page, the seller's preview link (`/publicar/…`) and the feed cards. The amount shows alone ("60 €"), never "0–60 €" (`formatPriceOrRange`).
- **Seller's "published" view and the listings email:** show "hasta 60 €" too; before, they showed no budget for such an ad.

## Why

"Busco teclado hasta 60 €" could only be saved as "Presupuesto 60,00 €", which reads like an exact price.

## Notes

- Admin review messages (`lib/marketplace/review.ts`) still say "sin precio" for a draft with only "Hasta". Admin-only, left as is.

## How to test by hand

1. In the admin editor, open a wanted ad (e.g. `busco-teclado-de-musica-22b142`), clear "Desde", keep "Hasta" at 60 and save: it saves.
2. Open its page: "Presupuesto hasta 60 €". In `/explore?tipo=busco` its card shows "60 €" with the "Presupuesto hasta" label (where the card is wide enough for a label).
3. Fill "Desde" 40 again and save: the page shows "Presupuesto 40–60 €".
4. Clear both fields: saving fails with "Revisa el título, el precio y las fotos". An item for sale with no price fails the same way.
5. Check the listing page at 375px and 320px: nothing wraps badly or is cut off.
