# Card #302: New listing stays on "Nuevo anuncio" from photos to publish

## What changed

- **No jump to "Anuncios":** after "Crear con IA" / "Continuar", `NewListingForm` now goes to `/admin/listings/new?anuncio=<id>` instead of `/admin/listings/<id>`. The new-listing page shows that listing's workspace (description, editor, Photos ↔ Description) right there.
- **One shared loader:** the code that loads a listing with its categories, places and languages into `ListingWorkspace` moved from `app/admin/listings/[id]/page.tsx` into `components/marketplace/admin-listing-workspace.tsx`. Both pages use it, so there is still only one editor.
- With `?anuncio=` the Product / Service / Wanted / Event tabs and the intro are not shown: the listing's type is fixed once it exists.
- `/admin/listings/<id>` (editing from "Anuncios") works as before.

## Why

The creation flow switched pages halfway: the top menu jumped from "Nuevo anuncio" to "Anuncios", which made it look like a different editor.

## Notes

- The top menu's highlight comes from the path only, so `/admin/listings/new?anuncio=…` keeps "Nuevo anuncio" highlighted.
- The browser Back button from the description step goes back to an empty "Nuevo anuncio" form, as before.
- An unknown `anuncio` id shows the 404 page, like an unknown `/admin/listings/<id>`.
- #310 sent new listings to `/admin/listings/<id>?nuevo=1` instead. The form doesn't use `?nuevo=1` anymore, but the menu still honours it (`CREATING_PARAM`), so old links keep "Nuevo anuncio" highlighted.

## How to test by hand

1. Open "Nuevo anuncio", add a photo, click "Crear con IA": the URL becomes `/admin/listings/new?anuncio=…`, "Nuevo anuncio" stays highlighted and the back link is unchanged.
2. Switch to Photos and back to Description: still the same page and tab.
3. Reload in the middle: the same listing comes back.
4. "Publicar ahora": the "¡Ya está online!" screen shows. Its "Nuevo anuncio" link opens an empty form.
5. Open an existing listing from "Anuncios": it opens on `/admin/listings/<id>` with "Anuncios" highlighted, as before.
6. Repeat once with a service and "Sin IA", and check 375px and 320px.
