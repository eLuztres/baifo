# Card #327: The description fills every field, the editor shows what's set, no AI picture from nothing

## What changed

- **Fill from the description.** The listing editor (`components/marketplace/listing-editor.tsx`) has a button under the description, "Rellenar lo que falta desde la descripción". It calls `fillAdminListingFields` (`lib/marketplace/admin.actions.ts`), which asks the AI (`readListingFields` in `lib/marketplace/ai.ts`) only for the fields of the listing's type:
  - Event: start date and time, entry price (0 = free), address, category, Corral town.
  - Product: price, condition, category, town. Wanted: budget from/to, worst accepted condition, category, town. Service: "desde" price, service type, category, town.
- `fillEmptyFields` (`lib/marketplace/listing-fields.ts`) puts the answer only into empty fields; an event's starting 0 counts as empty. A toast names the fields that were filled.
- **Nothing invented.** The AI prompts no longer guess a price, a budget, a condition or a town. A field the text doesn't mention stays empty. A new listing with no named town only gets a place when the shop has a single live one.
- **What's set.** Each field label shows a mark from `fieldState`: ✓ set, ✨ from the description, "Falta" when empty, "Necesario" with a dashed outline when publishing needs it (category, price except for services, an event's date). No red.
- **No picture from nothing.** "Crear foto con IA" needs the words typed in its own box, the description (also unsaved) or an uploaded photo. Without them the button is off and a note asks for a description. With only a photo, the picture is made from the photo.
- Review fix: a free event whose description says "gratis" no longer reports the entry as "filled" (0 and 0.00 are the same price).
- Texts in all 5 languages (`lib/marketplace/admin-texts.ts`).

## Why

The chef wants the "Tell me everything" description to do the work: write it once and every field fills itself, see at a glance what is still missing, and never get an AI picture invented from nothing.

## How to test by hand

1. Open an event in `/admin/listings/[id]` with an empty date and address. Write "Concierto el sábado 29 a las 19h en Bar La Ola, El Cotillo, entrada 10€" and tap **Rellenar lo que falta…**: date, address, entry and place fill and show ✨. A value you set yourself before stays.
2. Change a filled field by hand: its ✨ becomes ✓.
3. Empty a needed field (category, price, event date): it shows "Necesario" with a dashed outline, other empty fields show "Falta".
4. On a listing without uploaded photos, clear the description and open "Crear foto con IA": the button is off and the note asks for a description. Type words in its box: it turns on.
5. A product description without a price ("Una mesa de madera"): the price stays empty.
6. Check everything at 375px and 320px.
