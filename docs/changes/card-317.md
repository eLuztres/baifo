# Card #317: delete for good inside the listing editor

## What changed

- The listing editor (`/admin/listings/[id]`) has a red **Eliminar para siempre** button with a trash icon in the actions row at the top of the editor, next to "Marcar como vendido". It shows for every status: for a live listing it is the last button in that row, for the other statuses it is the only one there. (It was first built inside "Más opciones"; main (#311) has since removed that part.)
- It opens the same confirm dialog as the trash icon on `/admin/listings`, with the same warning ("Desaparece de la tienda y de Anuncios para siempre…").
- After confirming, the listing and its product are deleted, the "Anuncio eliminado" message shows and you are back on `/admin/listings`.
- Unsaved edits are not saved first: the listing is gone anyway.
- The button text is in all 5 languages (`deleteForGood` in `lib/marketplace/admin-texts.ts`).
- The delete uses the existing `deleteAdminListing` server action, now covered by tests in `tests/marketplace/listing-edit.test.ts`.

## Why

Until now a listing could only be deleted from the list. Found in review #306.

## How to test by hand

1. Open a test listing at `/admin/listings/[id]`, tap **Eliminar para siempre**.
2. **Cancelar** closes the dialog and the listing stays.
3. Tap it again and confirm: "Anuncio eliminado" shows, you land on `/admin/listings` and the listing is gone from the list and the shop.
4. A listing whose product is already in an order: the delete fails with "No se pudo eliminar este anuncio" and you stay in the editor.
5. Open a draft or pending listing: the button is there on its own at the top.
6. Check the button at 375px and 320px: nothing overlaps or runs off the side.
