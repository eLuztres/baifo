# Card #316: the "sold" word fits the listing type

## What changed

- The admin no longer calls every finished listing "sold". The button in the listing editor and the status text follow the listing type:

  | Type | Editor button (ES) | Status (ES) |
  |---|---|---|
  | Product | Marcar como vendido | Vendido |
  | Service | Ya no lo ofrezco | Ya no se ofrece |
  | Event | Terminado / cancelado | Terminado |
  | Wanted | Ya lo encontré | Encontrado |

- The texts exist in all five admin languages (ES, EN, IT, FR, DE) in `lib/marketplace/admin-texts.ts`, with two helpers: `markSoldText` (button) and `statusText` (status).
- They show in the editor button, the status line at the top of the editor, the badge on each card in Anuncios, and the "sold" filter tab when a type filter is set.
- Without a type filter the tab still says "Vendido", because that list mixes all types.
- The saved status stays `SOLD` for every type: only the wording changed, no database change.
- The short message after the click and the seller's own pages are unchanged.

## Why

A plumber or a concert isn't "sold", and a wanted ad is "found".

## How to test by hand

1. `/admin/listings`, open a live service: the button says **Ya no lo ofrezco**. A live wanted ad says **Ya lo encontré**, an event **Terminado / cancelado**, a product **Marcar como vendido**.
2. Click it on a test listing: the status line at the top of the editor shows the type's word (e.g. **Encontrado**).
3. Back in Anuncios, filter by that type: the card badge and the sold tab show the same word ("Encontrado · 1").
4. Remove the type filter: the tab says **Vendido** again.
5. Switch the admin language: the words follow it.
6. At 375px and 320px the longer button text wraps onto its own line without being cut off.
