# Card 268: Baifo art 5/5, the home first screen (step 1: picture versions)

## What changed

- The card asks for 2-3 versions of the picture to be shown to Joe before building, and cards 3/5 (the goat) and 4/5 (the palette) aren't finished yet. So this step builds no app code. It only adds versions to choose from.
- `docs/art/05-home/index.html`: a standalone preview page (no route, no code). It shows three pictures made with the baifo-art skill (card 265), each as a phone first screen and a desktop first screen, with a light/dark toggle:
  1. **On the dunes**: the goat reads on a Corralejo dune, with Lobos, ochre cones and a windmill behind it. It has the most free sky.
  2. **On the village terrace**: the goat reads on a whitewashed wall and looks out over the island (Calderón Hondo, a windmill, a path to the sea).
  3. **On the beach**: the goat reads on a towel under a palm, with a coffee. Across the water are a lighthouse and a white village.
- The page also has the wording in all 5 languages (made with the copywriting skill), one recommended set and alternatives.

## How to test by hand

1. Open `docs/art/05-home/index.html` in a browser (it's a file, so no dev server is needed).
2. Compare the three versions and toggle light/dark.
3. Narrow the window to 375px and 320px. Only the phone mocks stay, and nothing runs off the side.

## Review (testing stage)

- This step only adds a standalone preview page and three pictures, with no app code, routes, texts or migrations. So no tests were added.
- `npm run lint` is clean and `npm run test` passes (62 suites, 521 tests).
- Fixed: the wording note said the advertise link "keeps today's text", but the mock shows `HOME_HERO_ORDER` with "por WhatsApp" added. The note now says so.
- Still open for the build step, after Joe picks a version: the dark-mode treatment of the picture (the mocks keep the picture and the phone text light in dark mode), the new i18n keys in all `resources/*.json` / `brand/messages/*.json`, the iPhone one-screen fit (#138), and the video.

## Step 2: the home first screen (built, Joe picked version 3 "on the beach")

- **Six scenes** in `public/brand/home/` made with the baifo-art skill (#265) and #266's reading goat as reference: `newspaper` (first), `surf`, `kite`, `windmill`, `camel`, `hammock`. Each one comes as `<name>.webp` (3:4, phones) and `<name>-wide.webp` (3:2, screens wider than tall). The top-left sky stays free for the title.
- **`components/shared/home/scene-hero.tsx`**: the picture fills the first screen exactly (sticky header + hero = one screen, also on an iPhone). A small title panel at the top left sits on a soft, theme-coloured backdrop so palm leaves never run through the words. It has two buttons: "Leer el periódico" (`/explore`) and "Ver categorías" (the category ring), plus a small "Anúnciate desde 5 €" WhatsApp pill at the bottom.
- **`scene-crossfade.tsx`**: the only movement. The scenes fade into each other every 6 s. Only the shown and the next picture are loaded. With "reduce motion" the newspaper scene stays still. In dark mode the picture is dimmed a little.
- **Configuration**: `BRAND_HOME_SCENES=newspaper,surf,kite,windmill,camel,hammock` (in `.env.example`). Without it, the old hero / ring space is shown as before. New texts `HOME_SCENE_TITLE`, `HOME_SCENE_READ`, `HOME_SCENE_CATEGORIES` are in all `resources/*.json` (neutral) and all `brand/messages/*.json` (Baifo's newspaper wording).
- Test: `tests/components/scene-crossfade.test.tsx`.

### Deploying

Add `BRAND_HOME_SCENES=newspaper,surf,kite,windmill,camel,hammock` to the Vercel environment variables too.

### How to check

1. Open `/` at desktop, 390 (iPhone), 375 and 320 px wide, in light and dark. The picture fills the screen under the header, nothing is cut off, and the title and both buttons stay readable.
2. Wait 6 s and the next scene fades in.
3. "Ver categorías" goes to the ring (`/#showroom`) and "Leer el periódico" goes to `/explore`.
