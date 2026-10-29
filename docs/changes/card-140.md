# Card #140: listing videos autoplay and load faster

## What changed

- The product page's phone grid and its desktop photo card now use `playsWhenVisible`. A video only loads (`preload=none` until then) and plays while it is on screen. The layout that is hidden (desktop card on phones, phone grid on desktop) loads nothing.
- On phones, a tap on a video tile puts that same player in native full screen with sound, from where it is (`playFullScreen` in `lib/video-full-screen.ts`). Leaving full screen mutes it again. Photos, and browsers without video full screen, still open the lightbox.
- `RingGlassCard` got an optional `playsWhenVisible` prop. The home ring doesn't pass it, so it behaves as before.

## Why

The first fix for this card (still thumbnails, one autoplaying player, tap goes native full screen) was already on `main`. The newer phone layout undid it on phones: the same video loaded twice in full (phone grid plus the hidden desktop card), and a tap opened the lightbox, an extra player that started from zero.

## Known limits

- The small desktop thumbnail next to the main photo still loads about 1 MB of a video that has no saved still frame, to show its first frame. It does so on phones too, where it is hidden. Uploads with a still frame load nothing for it.
- In the desktop card, all slides stay mounted for the cross-fade. Slides at opacity 0 still count as "on screen", so a listing with several videos loads them all on desktop, as before this change.

## Tests

- `tests/lib/video-full-screen.test.ts`: full screen with sound and muted again afterwards, the iPhone path, and `false` where the browser can't.
- `tests/components/product-images.test.tsx`: videos on the product page don't autoplay or preload before they're on screen; a video tile goes full screen itself; a photo tile, or a browser that can't, opens the lightbox.

## How to test by hand

1. Open a listing with a ~50 s video at `http://localhost:3000/product/...`.
2. Desktop: the video starts playing muted within a few seconds. DevTools → Network shows one range request (206) for the file, not several full downloads.
3. Phone width (375px and 320px): the video tile in the grid plays on its own once on screen. Network shows only one download of the file.
4. Tap the video tile on a phone (ideally a real iPhone): it goes native full screen with sound, from where it was, without the lightbox. Close full screen: it plays on muted.
5. Tap a photo tile: the lightbox opens as before.
