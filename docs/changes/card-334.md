# Card #334: Goat video, the little baifo travels the island

## What changed

- Nothing in the shop code. The video is a separate Remotion project at `~/EluztresRepos/baifo-video` (not a git repo yet), so the shop gets no new dependencies.
- Two finished videos, 1080×1920 (9:16), 39.2 s, H.264 + AAC:
  - `~/Videos/changes/card-334-goat-video-es.mp4` (Spanish)
  - `~/Videos/changes/card-334-goat-video-en.mp4` (English)
- Story in six scenes: surfing, the Corralejo dunes, the volcanoes, neighbours passing on a surfboard and a chair, one photo puts a listing "En línea", then a sunset end card with the logo, "La red orgánica de Fuerteventura" and "Abrimos el 3 de noviembre · Todos bienvenidos".
- Comic goat in the logo's style, AI narrator (OpenAI TTS) with on-screen captions, a plucked-guitar version of Joe's hook made in code, soft waves. The sound is raised to −14 LUFS for social apps.

## Why

A warm mascot video for the 3 November opening campaign (Instagram, TikTok, WhatsApp, maybe the home page).

## How to make it again

1. `cd ~/EluztresRepos/baifo-video && npm install`
2. `npm run dev` opens the Remotion studio to preview `BaifoStoryEs` and `BaifoStoryEn`.
3. `npm run render:es` / `npm run render:en` write `out/baifo-es.mp4` / `out/baifo-en.mp4`.
4. The renders come out quiet. The `-final` files in `out/` were loudness-normalised to −14 LUFS afterwards with ffmpeg (`loudnorm`); that step is not in the npm scripts.

Texts and scene lengths live in `src/story.ts`. Each scene lasts its longest narration (es or en) plus a short pause.

## How to test by hand

1. Play both MP4s on a phone, sound on: voice, music and volume feel right; every voice line ends inside its scene.
2. With sound off, the captions tell the story and stay clear of the Instagram/TikTok buttons at the bottom and right.
3. The end card shows the logo and the opening date on two clean lines.
