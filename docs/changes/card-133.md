# Card #133: Clean-up for service videos

## What changed

- The video clean-up (ffmpeg: steadier, less noise, even light, a bit more colour, clearer sound, at most 1920 px and about 6 Mbit/s) was already on `main`. This card adds a time limit: ffmpeg is stopped after **150 s** (`VIDEO_CLEANUP_TIMEOUT_MS` in `lib/marketplace/video-cleanup.ts`).
- A stopped clean-up counts as a failed one: the original video stays, the temporary files are deleted and the listing still goes to review.
- New unit test `tests/marketplace/video-cleanup.test.ts`: the limit is passed to ffmpeg, the cleaned file is returned, and the temporary folder is removed when ffmpeg fails or is stopped.
- `docs/MARKETPLACE.md` now mentions the video clean-up in the `PROCESSING` step.

## Why

Sellers can upload two videos of up to 64 MB, cleaned at the same time inside one 300 s server function. A long clip on Vercel's CPUs could run past 300 s; Vercel then kills the function before any error handling, the listing stays in "processing" and the cron retries it the same way every time. With the limit, about half the time is left for the text and pictures.

## How to test by hand

1. Apply the migrations to the local database (`npx prisma migrate deploy`), so `Submission.usesAi` exists.
2. On `/admin/listings/new`, create a **Servicio** listing with a short phone video and **Crear con IA**. In the editor, the video is the cleaned-up one (steadier, brighter) and the switch goes back to the original. This uses paid AI for text and pictures.
3. Do the same with **Continuar** (no AI): the video stays exactly as uploaded.
4. After a deploy to Vercel, create a listing with a ~60 s / 64 MB clip and check the function log: either the cleaned video appears, or after 150 s the log says "not cleaned up" and the listing still reaches review with the original video. If ffmpeg is missing on Vercel, the log says "ffmpeg is missing for this platform".
