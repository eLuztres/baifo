# Card #318: take listings offline and bring them back

## What changed

- New listing status `HIDDEN` (migration `20261029150000_listing_hidden`).
- Listing editor (`/admin/listings/[id]`):
  - A live listing has an **Ocultar** button. It leaves the shop (the product is removed, as with sold) and gets the **Oculto** badge.
  - The bring-back button now shows for expired, sold, cancelled, rejected and hidden listings (`RELISTABLE` in `lib/marketplace/config.ts`). Its label: **Activar de nuevo** (expired), **Mostrar de nuevo** (hidden), **Volver a publicar** (the rest).
  - On an event, the sold button (**Terminado / cancelado**, from #316, asks first) ends it as `CANCELLED`, like the person's own cancel.
- `enableListing` brings back any of those states: a paid listing goes online for a new `LISTING_DAYS`, a never-paid one waits for payment again.
- `markAdminListingSold` and the new `hideAdminListing` only act on a live listing.
- The listings page has an **Oculto** filter tab. New texts are in all 5 admin languages.
- The seller's private link of a hidden listing shows "not available", like a sold one.

## Why

There was no way to hide a listing for a while, a sold, cancelled or rejected listing could not go back online, and only the seller could cancel an event.

## How to test by hand

1. Open a live product in `/admin/listings/[id]` and choose **Ocultar**: the badge says Oculto, the product is gone from the shop, and the **Oculto** tab on `/admin/listings` lists it.
2. Choose **Mostrar de nuevo**: it is online again with the same pictures and text and a new end date.
3. Mark a live product as sold, then choose **Volver a publicar**: online again.
4. Open a live event and choose **Terminado / cancelado**: the badge says Cancelado, and **Volver a publicar** brings it back.
5. Reject a listing from the WhatsApp review message, then open it and choose **Volver a publicar**: it waits for payment.
