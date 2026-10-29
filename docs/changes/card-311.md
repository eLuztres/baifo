# Card #311: Listing editor without "More options"

## What changed

- The collapsible "Más opciones / More options" section at the end of the listing editor (`components/marketplace/listing-editor.tsx`) is gone, with everything in it: the seller's raw text, the second photo upload and the "original" photo strip, the seller's WhatsApp number, name/nickname and language, the Normal / Premium plan choice and the "Rechazar" button.
- The editor now ends with Place → (live listings only) "Online hasta …" with **Alargar 1 mes** → the WhatsApp/consent/payment box → the actions.
- Rebuilt on main from 2026-10-29: the seller name field (#258) and fixing a live listing's number, which main had added to the section, went with it. **Alargar 1 mes** sat outside the section and stays.
- `updateAdminListing` no longer takes `sellerPhone`, `sellerName` or `sellerLocale`. Unknown fields are dropped, so a save (even from an older open editor) never changes the seller, their consent, name, language or the original photos.
- The plan is the listing's own (`listing.plan`, default Normal) for "Publicar ahora" and "Pagado".
- Removed what became unused: `rejectAdminListing`, `sellerDefault` in `getAdminListing`, the `PhotoUpload` component and the texts only these parts used (all languages in `lib/marketplace/admin-texts.ts`).

## Why

The section was confusing and none of its functions are needed in the editor. The seller sets their own name and language on their `/publicar` page, and listings can still be rejected from the WhatsApp review message.

## How to test by hand

1. Open a listing in `/admin/listings` that is "Por revisar". After Lugar come the WhatsApp/permission/payment box and "Publicar ahora", and there is no "Más opciones".
2. Change the title and save. The seller's number, name, language and photos stay the same (check the listing page's "Ofrecido por" and Contactar).
3. On a live listing, "Online hasta …" and **Alargar 1 mes** are still there. Do the same save with it and a "Esperando pago" one.
4. Check at 375 and 320 px wide, in light and dark mode: nothing overlaps or runs off the side.
