# Card #99: Category cover from the description

## What changed

- No app code changed on this card. Both fixes were already on `main` (commit b5d4069):
  - Saving a category that has a description and no picture makes the AI cover first (`components/admin/category-admin/category-editor.tsx`, `handleSubmit`). The save button shows "Creating the picture…" meanwhile. If the cover fails, a message says so and the category still saves without a picture.
  - When UploadThing can't be reached, the upload in `lib/actions/studio.actions.ts` (`uploadImage`) now gives the friendly "The photo could not be uploaded" message instead of a raw fetch error.
- New test `tests/lib/studio-cover.test.ts` for `generateCategoryCover`: a working upload returns the cover link; an unreachable UploadThing and an UploadThing error answer both give `STUDIO_UPLOAD_FAILED`.

## Why

"Crea con IA" seemed to make no cover. The cause was the network: this machine could not reach UploadThing (`*.ufs.sh`, `ingest.uploadthing.com` timed out), so every upload failed with `fetch ETIMEDOUT`, shown as a raw error. The AI picture itself was made fine.

## How to test by hand

Needs a network that reaches UploadThing.

1. Admin → Categories → edit a category with a description, press "Crea con IA": a cover appears in the form.
2. New category with only a name and a description, press Save: the button shows "Creating the picture…", then the category is saved with a cover.
3. With UploadThing blocked (e.g. a hosts entry pointing `ingest.uploadthing.com` to 127.0.0.1): "Crea con IA" shows "The photo could not be uploaded", and Save still saves the category, without a cover.
4. Check the category dialog at 375px and 320px width.
