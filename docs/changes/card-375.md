# Card 375: Admin editor: see and change the phone number

## What changed

- **Listing editor** (`listing-editor.tsx`): a "WhatsApp de la persona" card under the fields (the Contacto step) shows the number in full (`+34612345678`). Empty for Baifo's own listings.
- **Saving** (`updateAdminListing`): the number goes with the normal edit. A live listing saves it with **Guardar**; one still in review or waiting for payment saves it with the next action (Publicar, Enviar por WhatsApp, …), like its other fields.
- **Same as the seller's own change (#373):** the shared phone check (00 = +, 9 digits get +34), and the move to the new number now lives in `moveListingToNumber` (`lib/marketplace/seller-number.ts`), used by both. The listing and its product move to the seller with that number; WhatsApp contact, reminders and **Marcar como vendido** follow.
- A broken number says "Revisa el teléfono". A person's number can't be emptied ("Escribe su WhatsApp"); a Baifo listing may stay empty or get its first number.
- "Enviar por WhatsApp" and the payment panel follow the number typed in the field.
- **Tests:** new number (00 prefix, product, consent), broken or empty number, house listing staying empty or getting its first number.

## How to check

1. Open a live listing in `/admin/listings/<id>`: the WhatsApp card shows the full number.
2. Change it (e.g. `699 111 222`) → Guardar → reload: `+34699111222`. The product page's WhatsApp button opens the new number.
3. Empty a person's number → Guardar: "Escribe su WhatsApp". A Baifo listing without a number saves fine.
4. At 375px and 320px the card fits.
