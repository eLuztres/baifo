# Card #321: Editor: remove a photo from the main strip

## What changed

- In the listing editor (`components/marketplace/listing-editor.tsx`), every picture in the top strip (cover, original/AI) has a small ✕ in its bottom-right corner. It removes the picture from the listing.
- The ✕ is hidden when only one picture is left, so a listing always keeps at least one.
- Removing the cover makes the next picture the cover, because the cover is simply the first picture.
- A removal is an unsaved edit like any other: it reaches the shop only on Save, and leaving the page first still asks.

## Why

Removing a photo only worked in the photo grid under "Más opciones", which is hard to find, especially on a phone.

## How to test by hand

1. Open `/admin/listings/<id>` for a listing with two or more pictures.
2. Tap the ✕ on a picture that isn't the cover: it disappears from the strip.
3. Tap the ✕ on the cover: the next picture becomes the cover (bigger, with the filled star).
4. With one picture left, there is no ✕.
5. Save and reload: the removed pictures stay gone. Without saving, reloading asks first and the pictures come back.
6. Check at 375px and 320px width: the ✕ and the star don't overlap the original/AI switch.
