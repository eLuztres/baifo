# Card #337: Daemon shrinks videos over 10 MB before attaching

## What changed

- Nothing in shop-baifo. The change lives in **trello-agents** (`src/shrink-video.ts`, committed in 589d427).
- Before a video goes to Trello, `attachVideos` (`src/ship.ts`) calls `videoForTrello`. A `.webm` or `.mp4` over 9.5 MB gets a 720p copy under the same name in `small/`, at 600 kbps, halving the bitrate up to 3 times until it fits. The copy is deleted after the upload.
- GIFs and videos that already fit go up as they are.
- New test `trello-agents/tests/shrink-video.test.ts` (not committed yet): a small webm and an 11 MB GIF come back unchanged.

## Why

Trello refuses attachments over 10 MB, so agents' desktop videos failed with "413 File too large" (#289, #297).

## How to test by hand

1. Restart the daemon so it runs the shrinker.
2. On the next card whose desktop video is over 10 MB, check that the video attaches without a 413 error, under its usual name, and plays at 720p.
3. Check that `trello-agents/logs/videos/small/` is empty afterwards.
