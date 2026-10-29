# Card 237: Baifo promo video

## Why

Baifo needs a short promo for Reels, TikTok and the Instagram feed, built from real listing photos and the brand.

## What changed

- **Four videos in `~/Videos/`**, 14.3 s each, H.264 MP4 with a silent audio track:
  - `baifo-promo-es-9x16.mp4` and `baifo-promo-en-9x16.mp4` (1080×1920, Reels/TikTok)
  - `baifo-promo-es-4x5.mp4` and `baifo-promo-en-4x5.mp4` (1080×1350, Instagram feed)
- **Scenes:** the surfing goat with the hook "¿Lo vendes o lo buscas en Fuerte?", four real listings with their price (bike, electric bass, antique clock, "Se busca: tabla de surf"), the El Corral host photo, and an end card with the logo, baifo.es, "Publica por WhatsApp" and the WhatsApp QR.
- **Made with ffmpeg, not Higgsfield.** Higgsfield needs a login and credits, which an agent run doesn't have. The moves are slow zooms and crossfades.
- **Rebuild:** `python3 ~/Videos/baifo-promo-make.py [es|en]`. Texts are in `TEXTS` at the top. It reads the brand pictures from the `shop-baifo` checkout and the listing photos from `~/Videos/baifo-promo-photos/`.
- No code in the repo changes.

## How to check

- Play the four files: the hook shows within the first second, every text is readable, and nothing is cut off at the edges.
- In the 9:16 versions, no text sits in the bottom fifth, where Reels and TikTok put their buttons and caption.
- Upload one to Instagram or TikTok as a draft and add music there.
