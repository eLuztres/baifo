# Card #293: changing the category or type never changes the uploaded pictures

## What changed

- **New listing page (`/admin/listings/new`):** switching the type tab (item, Busco, service, event) keeps the photos and
  videos already uploaded. Before, the form started over on every tab switch and the uploads were gone. A step chosen
  while photos still upload ("Crear fotos con IA", "Usar las fotos") is dropped on a tab switch, so the admin picks it
  again for the new type (an event never gets AI pictures by mistake).
- **AI pictures:** the AI only saves its pictures into a listing that has no pictures yet. When two runs overlap (the
  upload's run, the description's run, a retry or the stuck-listing job), the late one is dropped instead of writing a
  new AI picture over the first.
- The listing editor (`/admin/listings/[id]`), `/publicar` and WhatsApp needed no change: a category or type change there
  never touches the pictures, and saving keeps them as the editor sends them.

## Why

Pictures the admin or seller uploaded were lost or replaced after choosing another category or type, which ruined posts.

## Under the hood

- `app/admin/listings/new/page.tsx`: `NewListingForm` no longer has `key={listingType}`, so React keeps its state when
  only `?tipo=` changes. `components/marketplace/new-listing-form.tsx` clears the queued step when `type` changes.
- `lib/marketplace/processing.ts`: `makeShopPictures` and `makeTextPicture` write with
  `updateMany` only where `images` is still empty (`makeShopPictures` also only while `rawImages` are still the photos it
  worked from, from #276). Changing the photos in step 1 empties `images` first, so its new run can save. A dropped late result was already uploaded to UploadThing
  and stays there unused.

## Tests

- `tests/components/new-listing-type-switch.test.tsx`: the page doesn't key the form on the type; an uploaded photo stays
  through a type switch and goes into `createAdminListing`; a step queued during the upload doesn't run after switching
  to Evento.
- `tests/marketplace/processing.test.ts`: a listing with pictures, set to each of the four types, is never re-pictured,
  reordered or emptied; a late AI run only fills a listing without pictures.
- `tests/marketplace/listing-edit.test.ts`: changing the category back and forth and saving keeps the same pictures in
  the same order, on the listing and on the live product.

## How to test by hand

1. Admin → new listing, upload two photos.
2. Tap Busco, then Servicio, Evento and back to Artículo: the two photos stay, in the same order.
3. Tap "Crear fotos con IA" and go on to the editor; while the pictures are made, change the category a few times.
4. Save: the AI pictures are the ones that first appeared, in the same order. Change the category again and save: same
   pictures.
5. Busco without a photo: the AI still draws one picture from the words.
6. Pick a large photo, tap "Crear fotos con IA" while it uploads, then tap Evento: nothing starts, the photo stays, and
   "Usar las fotos" is offered.
7. Check steps 1–2 at 375px and 320px.
