# Card #322: Editor, put photos in any order

## What changed

- **Drag and drop:** in the listing editor's photo strip, grab a photo and drop it where it should go; the others slide aside to make room (`hooks/use-drag-order.ts`, plain pointer events, no library).
- **Phone:** press and hold a photo for a moment, then drag. A quick swipe still scrolls the strip. Near the edge of the strip it scrolls along while dragging.
- **No arrows, no star:** the first photo is the main one and shows a small "Main" label. A tap still opens the photo full screen.
- **Video without a still frame:** dropped in first place, it springs back (`movePicture` / `canBeMain` in `lib/marketplace/pictures.ts`).
- **Keyboard:** focus a photo and use ← / →; a screen reader hears "Photo in place 2 of 4". Texts `photoOrderHint` and `photoMoved` in all 5 languages.
- Saving is unchanged: the editor already saves the photo order as it is.

## Why

Found in review #306: the order could only change by making a photo the main one. The first fix (arrows and a star) looked cluttered, so the chef asked for drag and drop.

## How to test by hand

1. Open a listing with 4+ photos in `/admin/listings/[id]`.
2. Desktop: drag photo 4 onto place 2; the others make room. Drag a photo to place 1: it becomes the main photo with the "Main" label.
3. Phone (375px, 320px): swipe the strip, it scrolls. Hold a photo, then drag it.
4. Drop a video without a still frame in first place: it springs back.
5. Tab to a photo and press ← / →: it moves and keeps focus.
6. Wait for autosave and reload: the new order stays.
