# Card #323: Editor: choose a video's still

## What changed

- **Listing editor:** a video without a still frame now shows an **Elegir imagen** pill under it. Its tooltip (and screen-reader text) says "Este vídeo no tiene imagen fija: elige una para poder ponerlo como principal." While it works it shows a spinner and "Sacando la imagen…". The texts are in all five admin languages.
- **Server action `addAdminVideoStill(id, url)`** (`lib/marketplace/admin.actions.ts`): admin only, and only for UploadThing videos. It downloads the video, takes the still, uploads it and returns the video link with the still in its `#video=` mark. In the database it updates the video and its other version (original ↔ cleaned-up video), so the Original / IA switch keeps the still.
- **`takeVideoStill`** (`lib/marketplace/video-cleanup.ts`): one JPEG frame at about 1 s, at most 1280 px wide, with ffmpeg. A video shorter than a second gives its first frame.
- If anything fails, the seller sees "No se pudo sacar una imagen del vídeo. Inténtalo otra vez." and nothing is stored.

## Why

A video can only be the main picture when it has a still frame. Without one, the star simply didn't show, with no explanation, and there was no way to add a still. The server takes the frame because the browser fails on exactly the videos that came without one (formats it can't play, iPhone timeouts).

## How to test by hand

1. Open a listing in the admin editor that has a video without a still (e.g. listing `0ac3c5cb…`). Under the video, the **Elegir imagen** pill shows; hovering it shows the hint.
2. Click it: the spinner shows for a few seconds, then the pill disappears and the star appears on the video.
3. Make the video the main picture with the star and save. The listing's cover is now the still.
4. If the video has an AI version (cleaned-up video), switch Original / IA: both have the still and the star.
5. Check the editor at 375px and 320px: the pill fits next to the other buttons.

## Notes

- The frame is picked automatically at about 1 second. There is no frame picker, and a video that already has a still can't change it yet.
- On a live listing, the still reaches the public page after **Guardar**, like any picture change.
