# Card 359: Listing editor: own photos, all actions at the bottom

## What changed

- **Top of the editor** (`components/marketplace/listing-editor.tsx`): only the status and the type switch are left.
- **Removed from the editor:** "Ocultar", "Crear otro anuncio" and "Ver anuncio". The last two stay on the "published" screen (`published-view.tsx`); `hideAdminListing` stays in the code.
- **Actions at the bottom**, after the last field and a thin line: the relist button with its hint (when the status allows it), "Marcar vendido" (live listings, asks first) and "Eliminar para siempre" last (asks first).
- **"Nueva foto" tile** after the photos, shown while there is room (12 pictures), also when the listing already has pictures. It opens two choices:
  - **Subir foto:** the file picker (photos and videos, several at once). Uploads go through `photosUploader` / `videosUploader` with `preparePhotos` and `uploadVideos`, like the new-listing form, with progress on the tile. The URLs join `images` and are saved with the Save button, like every other edit. They are originals: no Original/IA switch under them. A failed upload shows a plain message (`uploadFailed`, five languages), never the raw error.
  - **Foto con IA:** the existing AI prompt row, now with a close (×) button.

## Why

The chef wanted the fields first and every action at the end of the page, and a way to add their own photos to an existing listing, not only AI pictures.

## Review (testing stage)

- No bugs found. Added a test for a failed upload (friendly toast, pictures unchanged) next to the builder's tests for a successful upload and for the order of the buttons (`tests/components/listing-editor-photos-actions.test.tsx`).
- Updated `docs/MARKETPLACE.md` (the `/admin/listings/[id]` section).

## How to check

1. Sign in as admin and open a live listing at `/admin/listings/<id>`. At the top: only the status and the type switch.
2. Tap **Nueva foto** → **Subir foto**, choose two photos. The tile shows progress, then the photos appear at the end without an Original/IA switch, and the save bar says "Unsaved changes"; tap Save.
3. Drag an uploaded photo to the front, or open it and make it the main one. Reload: the order is kept.
4. Tap **Nueva foto** → **Foto con IA**: the prompt row opens as before; × closes it.
5. Scroll to the end: relist (on an ended listing), "Marcar vendido" and "Eliminar para siempre" last. Both ask first.
6. At 375 and 320 px: the menu's two choices fit, and the bottom buttons wrap cleanly.
