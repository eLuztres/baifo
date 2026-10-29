# Card 347: Slogan "Baifo es una red orgánica" on the site

## What changed

- **New text `BRAND_SLOGAN`** with `{shop}` for the shop name. The template keeps it empty in `resources/*.json`, so other shops show nothing until they set it. Baifo sets it in `brand/messages/*.json`: "{shop} es una red orgánica." (EN "is an organic network.", DE "ist ein organisches Netzwerk.", IT "è una rete organica.", FR "est un réseau organique.").
- **Home hero:** the slogan is a small line above the main heading (`scene-hero.tsx`, `.slogan` in `scene-hero.module.css`).
- **Footer:** the slogan sits under the logo. `FOOTER_TAGLINE` now starts with "Hecho en la isla, para la isla."
- **Page description and share preview:** `BRAND_DESCRIPTION` opens with the slogan and the "Hecho en la isla, para la isla" line. `app/layout.tsx` now passes it to Open Graph too (the share preview had no description before).
- **Old wording replaced:** the home page title (`HOME_SEO_TITLE`) was "Baifo – la red orgánica de Fuerteventura" and is now "Baifo es una red orgánica". The newspaper description (`EXPLORE_SEO_DESCRIPTION`) started with "Una red social orgánica" and now starts with "Baifo es una red orgánica". Same in all five languages.
- README lists `BRAND_SLOGAN` under the main texts.

## Why

Joe picked one slogan for how Baifo presents itself, the same everywhere: "Baifo es una red orgánica." ("red social" was too long and sounds like Facebook/Instagram).

## Not done

- The WhatsApp welcome message is a greeting and a question, with no intro line, so it stays as it is.
- The end card of the promo videos is outside this repo's code.

## How to check

1. Open `/` at desktop, 375 and 320 px: the slogan shows above the heading, nothing overlaps, the buttons stay in place.
2. Scroll to the footer: the slogan is under the logo, followed by "Hecho en la isla, para la isla. …".
3. Switch the language: the slogan follows (EN, DE, IT, FR).
4. View the page source: `<title>` is "Baifo es una red orgánica", and `description` and `og:description` start with "Baifo es una red orgánica."
5. Open `/explore` and check its `description` starts with the slogan.

## Review

- Found and fixed: the build left the old "red orgánica de Fuerteventura" title and the "red social orgánica" newspaper description, which the card asked to replace.
- Added `tests/lib/slogan.test.ts`: the template default stays empty, every language fills in the shop name, and the home title matches the slogan.
