---
name: baifo-badge
description: Put the round baifo.es badge with the moving goat on a video, keeping the sound and clear of a phone's story bar. Use on /baifo-badge, or when a video or clip for Baifo needs the baifo badge, logo or baifo.es domain on it.
---

# Baifo badge on a video

**The badge always goes where the person's finger points.** Before rendering a clip, look at frames spread over it with a 10% grid on top. Find the fingertip while they point, and set the badge's center right after it in the pointing direction, with the fingertip just touching the edge. It stays in that one place for the whole clip.

```shell
BADGE_AT=0.38,0.72 .claude/skills/baifo-badge/add-badge.sh <video> [output.mp4]
```

`BADGE_AT` is the badge's center as shares of the width and height. Two hands pointing inward or down: between them, on the body. No pointing in the clip: leave `BADGE_AT` out for the default spot.

Without an output, it saves `<video>-baifo.mp4` next to the original and never changes the original.

All clips live in `~/Videos/baifo-clips`: copy each new person's clip from `~/Downloads` to `originals/` and save its badged version in `with-badge/` as the next number: `baifo-14.mp4`, `baifo-15.mp4` and so on. Product clips (wetsuits, boards) and exact duplicates stay out. Don't ask the user about each clip: place the badge, save it, and report in a line or two.

Look at frames from every result, spread over the clip, and check that the badge doesn't cover a face or the hand of someone pointing.

Then upload the clips to the Google Drive folder shared with Chantal: `.claude/skills/baifo-badge/sync-drive.sh`. It only adds and updates, and never deletes anything on Drive.

- The badge is `baifo-badge.webm`, a transparent loop where only the goat wiggles. Always use this one, so every video has the same badge. To change its look or movement, edit `make-badge-loop.py` and run it again.
- Without `BADGE_AT`, portrait videos keep the badge 20% above the bottom, and landscape videos get it in the bottom right corner. Keep it as high as the pointing allows, so a phone's story bar doesn't hide it.
- It must never cover a face. When there's little room, make it smaller for that video with `BADGE_WIDTH` (default 0.46, 0.336 is the smallest used so far).
- A video with the old flat round badge burned in: cover it exactly with `BADGE_WIDTH=0.63 BOTTOM_MARGIN=0.07` until the sender provides the original. It can't go higher without showing the old badge.
