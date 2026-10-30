# Card #361: New listing, third step Contacto

## What changed

- A new admin listing now has three steps: Fotos → Descripción → Contacto (`listing-steps.tsx`). This applies to every type (product, Busco, service, event).
- `description-step.tsx` holds both the Descripción and the Contacto step. Descripción ends with "Siguiente". The WhatsApp number (same hints and checks as before) and a new optional name field are on Contacto, and the button that sends the listing to the AI is at the end of Contacto.
- "Siguiente" stays off while the description is required (no photo, or "use my own words") and still empty. Clicking "3" in the step bar then puts the cursor in the text box.
- The name is checked like on the person's own page (`sellerNameSchema`: up to 30 characters, no links or phone numbers) and saved on `Seller.name` by `describeAdminListing`. Left empty, the name the person already has stays.
- Moving between the steps keeps everything written. Going to the photos from Contacto returns to Descripción afterwards, since the photos step only knows "go back".
- Once the AI has written the listing, the step bar above the editor marks step 3.
- On phones the step circles and gaps are a bit smaller, so three steps fit on one line at 320px in all five languages.
- New texts in all languages in `lib/marketplace/admin-texts.ts`: `stepContact`, `nextStep`, `sellerNameLabel`, `sellerNamePlaceholder`, `sellerNameHint`.
- Tests: `tests/components/description-step.test.tsx` (the step flow, sending number and name, the missing-number message, values kept between steps), plus updates to the step bar and `describeAdminListing` tests.

## Why

The phone number was hidden at the bottom of the description. A separate contact step makes it clear who is behind the listing, and it is the place to add the person's name.

## How to test by hand

1. Sign in as admin, open `/admin/listings/new` and start a listing without a photo. "Siguiente" is off until you write a description.
2. Write a description, press "Siguiente". Contacto shows the WhatsApp number with its hint and the optional name.
3. Press "2" in the step bar: the description is still there. Press "Siguiente" again: number and name are still there.
4. Press "Escribir el anuncio con IA" without a number: the message asks for it. Add a number and a name and send. The listing is written by the AI as before, and the seller has the name.
5. Try a name with a phone number in it (e.g. "Lula 612345678"): sending says "Revisa el nombre". The field stops at 30 characters.
6. Write "Info: 628 111 222" in the description and go to Contacto: the WhatsApp field is filled with it (#367), and you can still change it.
7. On every step, switch the type tabs (Producto · Busco · Servicio · Evento): the step stays, what you wrote stays, only the type's hints change.
8. Repeat with a photo and with the Busco, service and event types; check the hints match the type.
9. At 375px and 320px the step bar fits on one line and nothing runs off the side.
