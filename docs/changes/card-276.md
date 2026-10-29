# Card #276: New listing, jump between Photos and Description

## What changed

- The step bar on a new listing ("Photos" – "Description") is clickable: the step you are not on is a button.
- From the Description step the admin can go back to Photos, add or remove photos (same upload, "another photo?" drawer and limit of 8), and come back. The description is only hidden meanwhile, so the text, text mode, contact choice and phone number stay as they were. The page does not reload.
- New server action `updateAdminListingPhotos` (`lib/marketplace/admin.actions.ts`) saves the new photo set while the listing is still collecting. Photos that stay keep their AI picture; only new photos go to the AI. Nothing changed: no call at all.
- `makeShopPictures` (`lib/marketplace/processing.ts`) reuses AI pictures that already exist and only saves if the photos are still the ones it started with, so a picture run for an old photo set can't overwrite the new set.
- On `/admin/listings/new`, "Description" works like the main button (AI pictures, photos as they are for an event, or "no photo" without any). A listing that already exists keeps its earlier choice of AI pictures or photos as they are.
- After "Write the listing with AI" the steps are no longer clickable; photos are changed in the editor as before.

## Why

The admin often notices a missing or bad photo only while writing the text. Before, there was no way back to the photos without losing what was typed. Re-using the AI pictures keeps going back free of extra AI time and cost.

## How to test by hand

1. Open `/admin/listings/new?tipo=servicios`, upload one photo, close the drawer and press "Continue without AI" (no AI cost) or "Make pictures".
2. On the Description step type a text and a phone number.
3. Click "Photos" in the step bar: the Photos screen shows the listing's photo. Add a photo and remove the first one.
4. Click "Description": the text and phone are still there, and the photos are the new set.
5. With AI pictures: going back without changes costs nothing; removing a photo keeps the others' AI pictures at once; adding one makes a picture for that one only.
6. Press "Write the listing with AI": the steps can't be clicked any more.
7. Check the step bar and the Photos screen at 375px and 320px width.
