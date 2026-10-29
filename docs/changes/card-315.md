# Card #315: "Mark as sold" asks first

## What changed

- In the listing editor (`components/marketplace/listing-editor.tsx`), "Marcar como vendido" on a live listing now opens a short confirm instead of acting at once.
  - Title "Marcar como vendido", text "¿Seguro? El anuncio sale de la tienda.", buttons "Cancelar" and a red "Marcar como vendido".
  - Only the red button marks the listing sold. Like the old button, it saves the edits first, then takes the listing offline.
  - Cancel, Esc or a tap outside the dialog changes nothing.
- The new texts `markSoldConfirm` and `markSoldCancel` are in all five admin languages (`lib/marketplace/admin-texts.ts`).
- Test: `tests/components/listing-editor-mark-sold.test.tsx` (asks first, cancel does nothing, confirm saves and then marks sold).

## Why

One tap took a live listing out of the shop and deleted its product, with no undo, right next to "View listing".

## How to test by hand

1. Open a live listing in `/admin/listings`.
2. Tap **Marcar como vendido**: the confirm opens. Tap **Cancelar**: the listing is still live.
3. Open it again and press Esc, or tap outside: still live.
4. On a test listing, open it again and tap the red **Marcar como vendido**: a message shows and the listing is sold and gone from the shop.
5. Check at 375px and 320px: the buttons stack and nothing is cut off.
