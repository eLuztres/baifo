# Card 350: Listing editor: switch the type any time

## What changed

- **Type switch in the listing editor** (`components/marketplace/listing-editor.tsx`): a row of four choices (Producto · Busco · Servicio · Evento) under the status line, for every listing in any state. Icons show from `sm` up; on phones the four names fit in one row down to 320 px.
- **Switching keeps everything**: title, texts, photos, place and category stay. The fields of the new type appear (event: date, address, entry; service: kind of offer and "desde" price; Busco: budget "hasta"; product: price and condition). The fields of the old type stay in the form until saving, so switching back loses nothing and leaves nothing to save.
- An event starts free: switching to Evento with an empty price fills in "0". Switching away again takes that "0" back out, so a service or Busco without a price stays without one.
- **Confirm only for a live, paid listing**: "¿Cambiar a Evento?" with a note that the listing stays live and the fee stays the same. Other listings switch right away.
- **Saving** (`updateAdminListing` in `lib/marketplace/admin.actions.ts`) takes the new `type` (Zod enum), checks the edit for it (an event needs a date, a product a price, "cualquier estado" only for Busco), clears what doesn't fit the new type (condition for services/events, date and address for non-events, kind of offer for non-services, budget range for non-Busco) and updates the live product's `type`, so badges, filters and the "sold" words (#316) follow.
- **"Rellenar lo que falta"** reads the description for the type the editor shows, even before it's saved.
- New texts `changeType`, `changeTypeConfirm`, `changeTypeCancel` in all five languages (`lib/marketplace/admin-texts.ts`).

## Why

Joe wants to fix a wrongly typed listing (e.g. a Busco the AI took for a product) at any moment, without making a new listing.

## Review (testing stage)

- Fixed: switching an empty-priced Busco or service to Evento and back left "0" as its price ("desde 0 €"). The auto-filled "0" now goes again when leaving Evento.
- Added a test that "Rellenar lo que falta" uses the type the editor shows, and rejects an unknown type.

## How to check

1. Open `/admin/listings/<id>` for a live, unpaid product. Switch to Evento: date and address appear, condition goes, no question asked. Switch back to Producto: price and condition are as before and Save is off.
2. Switch to Evento, pick a date, Save. Open the listing in the shop: it shows the event date and badge.
3. Switch to Busco, set "hasta 60", Save: the sold button now reads the Busco wording ("Ya lo encontré").
4. On a live, paid listing, switching asks first; "No cambiar" keeps the type.
5. Try to save an Evento without a date: an error asks for the date.
6. Check at 375 and 320 px: the four choices fit in one row, nothing overlaps.
