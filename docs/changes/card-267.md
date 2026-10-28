# Card #267: Baifo art 4/5, color scheme

## What changed

- `docs/art/04-palettes.html` (open it straight from the file) shows three palettes, A · Dune & Lagoon, B · Atlantic & Whitewash and C · Whitewash & Sunset, next to today's colors. Each one has screenshots of the real home and listing pages, in light and dark, at desktop and phone width, plus WCAG contrast ratios and a ready-to-paste `.env` block.
- Joe picked **B · Atlantic & Whitewash** for light and dark. It is marked "chosen" on the preview page.
- B is applied only through the `BRAND_COLOR_*` / `BRAND_DARK_COLOR_*` settings in `shop-baifo/.env`. No code or `globals.css` changed. Chart colors stay as they were.
  - Light: near-white pages with a hint of sea (`#F4F8F6`), white cards, teal buttons (`#0A716D`), sea-blue highlights (`#136F8A`).
  - Dark: deep Atlantic blue (`#0B1B1F`), turquoise buttons (`#4EC3BF`), coral highlights (`#EE8A70`).

## Why

The new artwork (art 1/5, 2/5) is light and sunny. The old light theme was tinted turquoise all over, which looked heavy next to it. B keeps the logo's teal for buttons (trust, clear calls to action), makes the pages calmer and whiter like the island's houses, and gives the dark theme a warm coral touch.

## Contrast (WCAG AA, 4.5:1 for text)

| Pair | Light | Dark |
|---|---|---|
| Text on page | 13.7:1 | 15.4:1 |
| Softer text on muted | 5.9:1 | 7.1:1 |
| Button text on button | 5.8:1 | 7.6:1 |
| Highlight text on highlight | 5.7:1 | 7.3:1 |
| Button color on page | 5.5:1 | 8.3:1 |

## Deploying

`.env` is not committed. The same 34 values must be set in the Vercel project's environment variables (copy them from the "`.env` values for B" block on the preview page), then redeploy.

## How to test by hand

1. Restart the dev server if it doesn't pick up `.env` changes, then open `http://localhost:3000`.
2. Use the light/dark switch in the header. Light: near-white page, white cards, teal buttons. Dark: deep blue page, turquoise buttons, coral highlights.
3. Open a listing (`/product/...`): the info card is white (light) or dark blue (dark), the Contact button is teal or turquoise and readable.
4. Check at 375px and 320px width: same colors, nothing hard to read.
