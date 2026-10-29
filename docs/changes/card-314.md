# Card #314: No AI badge on photos of listings made without AI

## What changed

- The listing editor (`components/marketplace/listing-editor.tsx`) asks `isAiPicture` (`lib/marketplace/pictures.ts`) whether a photo gets the ✨ badge.
- A listing with AI pictures marks exactly those pictures, as before.
- A listing without AI pictures marks its cover only if it was made with AI (`usesAi`). That fallback is for older AI listings that have no record of which picture is AI.
- A listing made without AI never shows the badge.
- `tests/marketplace/pictures.test.ts` covers the three cases.

## Why

A listing made without AI has no AI pictures, so the editor fell back to marking the first photo, the seller's own original, as AI.

## How to test by hand

1. `/admin/listings/new`: create a listing with a photo and choose to keep the photos as they are (no AI). Open it in the editor: no ✨ on any photo.
2. Create a listing with **Mejorar con IA**. In the editor the AI pictures still show ✨, and switching a picture to its original removes the badge.
3. Check both at phone width (375px).
