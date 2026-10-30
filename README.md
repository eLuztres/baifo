# Custom Shop Template

## Valores de El Baifo

Todo lo que se construye en esta tienda sigue estos valores.

### Idea central

El Baifo es una red social orgánica: una red de personas, encuentros y conexiones que cuenta con una herramienta digital para facilitar las publicaciones. La tecnología está al servicio de las personas y de sus relaciones; no sustituye el encuentro humano.

Queremos recuperar algo sencillo: mirarnos, presentarnos, darnos la mano y decir «¿qué necesitas?, ¿en qué puedo ayudarte?». Nos conecta también el deseo de vivir Fuerteventura como el paraíso que un día elegimos.

### Valores que orientan el proyecto

1. **Las personas primero.** Creamos espacios para conocernos, compartir ideas y conectar con gente creativa.
2. **Sencillez.** Si hay varias formas de hacer algo, elegimos la más fácil de entender y utilizar.
3. **Trato directo y claro.** Cada persona publica su anuncio y decide cómo quiere que contacten con ella. Baifo facilita el encuentro; las personas gestionan su intercambio.
4. **Privacidad y autonomía.** Cada persona decide qué información comparte. El teléfono es opcional, se publica con autorización y puede retirarse. No pedimos correo, datos fiscales, bancarios ni información personal que el anuncio no necesita.
5. **Corrales humanos y autónomos.** Los corrales ofrecen puntos concretos donde encontrar a una persona. Todos parten de una base común y cada uno decide qué servicios adicionales ofrece. La persona elige si los utiliza y acuerda sus condiciones directamente con ese corral.
6. **Condiciones claras.** El anuncio tiene un precio y un periodo definidos. La colaboración con un corral se remunera por la publicación o el servicio acordado, nunca como porcentaje de una venta.
7. **Responsabilidad individual.** Baifo facilita publicar y conectar. Cada persona decide cómo continuar la conversación y responde de sus acuerdos, llamadas y ventas.
8. **Creatividad y disfrute.** Queremos que las personas creen, compartan y participen porque disfrutan haciéndolo, sin convertir cada encuentro en una obligación de vender, producir o generar ingresos.
9. **Tecnología al servicio de las personas.** La IA puede ayudar a crear o mejorar materiales cuando la persona lo decide. La decisión y el control siguen en manos de quien publica.
10. **Comunidad y ocio.** Las apañadas y los encuentros sirven para recoger anuncios, conocernos y compartir un rato en un ambiente relajado.

### Vocabulario que representa a El Baifo

Personas · encuentro · conexión · corral · apañada · colaboración · creatividad · sencillez · autonomía · claridad · privacidad · disfrute · intercambio directo

### Expresiones que conviene evitar

- «Captar clientes» o «generar leads».
- «Monetizar a las personas» o «ganar un porcentaje de cada venta».
- «Garantizamos que venderás» o «nos encargamos de cerrar la operación».
- «Tienes que renovar» o mensajes insistentes para volver a publicar.
- «Completa tu perfil» o solicitudes de datos que el anuncio no necesita.
- Presentar la IA como sustituta del criterio, la creatividad o el contacto humano.

### Frase guía

**El Baifo conecta personas. Cada una decide qué comparte, cómo se relaciona y qué acuerdos quiere alcanzar.**

---

A white-label online shop: products, cart, checkout (Stripe, PayPal, cash on delivery), orders, user accounts and an admin panel. Built with Next.js 15, Prisma/PostgreSQL and Better Auth.

**Every customer shop runs the same code.** Name, logo, colors, texts, contact details, languages, currency and shop rules are configuration. So you can create a new shop in minutes and update all of them from one place.

- [1. Create a customer shop](#1-create-a-customer-shop)
- [2. Customize everything](#2-customize-everything)
- [3. Put it online](#3-put-it-online)
- [4. Update customer shops](#4-update-customer-shops)
- [5. Commands](#5-commands)
- [6. Working on the template itself](#6-working-on-the-template-itself)

---

## 1. Create a customer shop

### The easiest way: Claude Code

In Claude Code (in this folder or the workspace), type:

```
/new-shop
```

It asks for the name and, optionally, the customer's **Instagram page**. It reads the logo, colors and description from Instagram using the Claude in Chrome extension, and you confirm them. It then creates the shop and walks you step by step through GitHub, Vercel, the database, Google login, Stripe, PayPal, emails and the domain.

### The wizard in the terminal

```shell
npm run create-shop
```

It asks for:
- the name
- the logo, whose colors are used when you don't give one
- the theme and main color
- contact details, languages and currency
- the GitHub repo

Then it:
1. creates `../shop-<name>` as a copy of this template, connected to it for updates
2. copies the logo into `public/brand/`
3. writes a complete `.env`, including generated secrets and a full color palette
4. commits
5. pushes to GitHub, if you gave a repo

For repeatable setups, put the answers in a file: `npm run create-shop -- --config shop.json`. The fields are listed in `.claude/skills/new-shop/SKILL.md`.

### Try it locally

```shell
cd ../shop-<name>
npm install
# put a DATABASE_URL into .env (see docs/SETUP.md, step 3)
npx prisma migrate deploy
npm run dev                       # http://localhost:3000
```

For a playground with sample products: `npx tsx db/seed.ts`. It **wipes the database** and creates `admin@example.com` / `123456`, so never run it on a real shop.

---

## 2. Customize everything

A shop is customized in **three places only**. The template never changes them after creating them, so updates always merge cleanly.

| Place | What goes there | Committed? |
| :--- | :--- | :--- |
| `.env` (and Vercel's environment variables) | all settings below | no, it has secrets |
| `public/brand/` | logo, icon, hero image, social preview image, font | yes |
| `brand/messages/<lang>.json` | your own wording, per language | yes |
| `brand/*.json`, `brand/studio.mjs` | home page pictures and AI studio prompts (see *Home page* below) | yes |
| `brand/print/` | print files such as stickers, not served by the website (optional) | yes |

Settings are read when a page is requested. Locally, restart `npm run dev`; on Vercel, redeploy. Settings starting with `NEXT_PUBLIC_` are built into the code and always need a rebuild or redeploy.

> In `.env`, put colors in quotes, e.g. `"#14B8A6"`: an unquoted `#` starts a comment. Writing them without the `#` (`14B8A6`) works too.

### Name and description

```env
APP_NAME=Ocean Surf Co.
APP_DESCRIPTION=Boards, wetsuits and gear for every wave.
```

The name appears in the header, footer, browser tab, emails and the home page title. The description goes to search engines and the home page. For a different description per language, set `BRAND_DESCRIPTION` in `brand/messages/<lang>.json`.

### Logo and images

Put the files into `public/brand/` and point to them, or use full URLs:

```env
BRAND_LOGO=/brand/logo.png          # header, footer, sign-in, emails (SVG, PNG, JPG)
BRAND_LOGO_DARK=/brand/logo-dark.png  # the logo on dark backgrounds (dark mode); default: BRAND_LOGO
BRAND_LOGO_ANIMATED=/brand/logo-alive.svg  # header: an animated mark (SVG, still with "reduce motion") + wordmark; default: off
BRAND_LOGO_ANIMATED_DARK=/brand/logo-alive-dark.svg  # the animated mark in dark mode
BRAND_LOGO_WORDMARK=/brand/wordmark.png    # the wordmark beside it; default: the shop name as text
BRAND_LOGO_WORDMARK_DARK=/brand/wordmark-dark.png  # the wordmark in dark mode
BRAND_LOGO_HEIGHT=64                  # logo height in the header in px (tablets up, phones 3/4), at most 72
BRAND_ICON=/brand/icon.png          # browser tab icon
BRAND_HERO_IMAGE=/brand/hero.jpg    # big picture on the home page (default: logo on a color gradient)
BRAND_OG_IMAGE=/brand/og.jpg        # preview image when the shop link is shared (default: logo)
BRAND_SHOW_NAME=false               # hide the name next to the logo when the logo already contains it
BRAND_SHOW_SIGN_IN=false            # no sign-in / "Join" button for visitors (admins use /sign-in directly)
BRAND_STAMP=/brand/stamp.png        # a small mark (e.g. your mascot) in the corner of item pictures, drawn in white
```

### Theme and colors

```env
BRAND_THEME=dark                    # light | dark | system (system = visitors get a light/dark switch)
BRAND_COLOR_PRIMARY="#14B8A6"       # buttons, links, highlights
```

The theme alone gives a complete, neutral look, and one main color is usually enough. For full control, every color token can be set as `BRAND_COLOR_<TOKEN>`:

| Token | Used for |
| :--- | :--- |
| `PRIMARY` / `PRIMARY_FOREGROUND` | main buttons / their text |
| `ACCENT` / `ACCENT_FOREGROUND` | highlights, small labels / text on them |
| `BACKGROUND` / `FOREGROUND` | page background / normal text |
| `CARD` / `CARD_FOREGROUND` | product cards, boxes |
| `MUTED` / `MUTED_FOREGROUND` | subtle backgrounds / secondary text |
| `SECONDARY` / `SECONDARY_FOREGROUND` | secondary buttons |
| `BORDER`, `INPUT`, `RING` | lines, form fields, focus outline |
| `POPOVER` / `POPOVER_FOREGROUND` | menus, dropdowns |
| `DESTRUCTIVE` / `DESTRUCTIVE_FOREGROUND` | delete buttons, errors |
| `CHART_1` … `CHART_5` | admin dashboard charts |

- `BRAND_COLOR_*` applies in both light and dark mode. `BRAND_DARK_COLOR_*` overrides a color in dark mode only, which matters with `BRAND_THEME=system`.
- The wizard fills in a matching full palette from one main color. To get suggestions from any image: `npm run brand-colors -- path/to/logo.png`.

```env
BRAND_RADIUS=0.25rem                # corner roundness: 0 = square, 0.75rem = default, 1.5rem = very round
BRAND_FONT_DISPLAY_URL=/brand/display.woff2   # font for headings (body text stays Inter)
```

### Texts

All texts come from `resources/<lang>.json`. To change one for a shop, put the same key into `brand/messages/<lang>.json`. Only the keys you want to change are needed:

```json
{
  "HERO_TITLE": "Ride every wave",
  "HERO_EYEBROW": "Since 1998",
  "FOOTER_TAGLINE": "Handmade boards from Fuerteventura.",
  "VALUE_SHIPPING_TITLE": "Free shipping over 100 €"
}
```

Where the main texts appear:

| Keys | Where |
| :--- | :--- |
| `HERO_EYEBROW`, `HERO_TITLE`, `HERO_CTA`, `BRAND_DESCRIPTION` | top of the home page |
| `VALUE_*_TITLE`, `VALUE_*_DESCRIPTION` | the four boxes on the home page (shipping, payment, returns, support) |
| `PRODUCT_PERK_*` | the three lines under the product description |
| `STORE_TITLE`, `STORE_DESCRIPTION`, `STORE_EMPTY` | shop page |
| `CONTACT_HEADING`, `CONTACT_INTRO` | contact page |
| `BRAND_SLOGAN` | short slogan with `{shop}`, above the home page heading and in the footer; empty hides it |
| `FOOTER_TAGLINE` | footer |
| `PRIVACY_TEXT`, `IMPRINT_TEXT` | `/privacy` and `/impressum`, linked in the footer. The legal notice has placeholders in `[brackets]`: every shop must set its own. Blank lines separate paragraphs, `## ` starts a heading |
| `WELCOME_*` | welcome email |

- `{shop}` in a text is replaced by the shop name, e.g. `"Welcome to {shop}"`.
- Translate your overrides into each language the shop offers. A language without the override shows the default text.

### Contact details

Each one is optional. Empty ones are hidden, and without any the contact page and its menu link disappear.

```env
CONTACT_EMAIL=hello@oceansurf.com   # also the reply-to address of all emails
CONTACT_PHONE=+34 600 000 000
WHATSAPP_NUMBER=34600000000         # turns the phone into a WhatsApp link (shown itself without CONTACT_PHONE)
INSTAGRAM_ACCOUNT=oceansurf
SHOW_CONTACT_EMAIL=false            # hides one on the website without unsetting it (also _PHONE, _INSTAGRAM)
```

### Languages

```env
LOCALES=es,en                       # any of en, es, de, fr, it (default: all)
DEFAULT_LOCALE=es                   # when the visitor's browser language isn't offered
```

With one language, the language switcher disappears.

### Money and shop rules

```env
NEXT_PUBLIC_CURRENCY=EUR            # for prices, Stripe and PayPal (rebuild needed)
NEXT_PUBLIC_NUMBER_LOCALE=de-DE     # number format: de-DE → 1.234,50 €, en-US → €1,234.50
TAX_RATE=0.21                       # 21 % added at checkout (0 = prices include tax)
SHIPPING_PRICE=10
FREE_SHIPPING_THRESHOLD=100         # free shipping above this order value
PAYMENT_METHODS=Stripe, PayPal      # any of PayPal, Stripe, CashOnDelivery
DEFAULT_PAYMENT_METHOD=Stripe
PAGE_SIZE=12                        # products per page
RESERVATION_HOURS=48                # how long "Show interest" reserves a product
NEW_LISTING_HOURS=48                # how long a listing shows the "New" badge in the feed
ENDING_SOON_DAYS=3                  # days before going offline that a listing shows in the feed's "Ending soon"
PRICE_CLASSES=Essential:60, Premium:120   # optional price classes: a product in a class takes its price
OWNER_EMAIL=owner@example.com       # the owner: only they can make, change or delete admins, and no admin can remove them
SIGN_UP_BY_INVITE=true              # nobody signs up alone: admins create one-time invite links in Admin → Users
SERVICE_AREA=Corralejo              # for now only here: a notice above the header says so (remove it to serve everywhere)
OFFERS_ENABLED=false                # turns off offers (Admin → Offers: big announcements on the home page and /ofertas); on by default
```

### Home page

The home page is short and scrolls normally: a compact opening (what the shop is and the two ways in), the "What can you do?" cards, the **showroom** (a ring of store categories you turn by swiping, with their products in front) and the contact details. Store categories are managed right on the showroom by admins.

The hero picture (`BRAND_HERO_IMAGE`) is decorative by default. If it shows something worth describing, put its alt text in `HOME_HERO_IMAGE_ALT` in `brand/messages/<lang>.json`.

**Home slideshow:** pictures in `public/brand/hero/` replace the hero with a full-screen slideshow that crossfades every 7 s (still with "reduce motion"). They play in file name order: `01-beach.webp` (3:4 or square, phones) and `01-beach-wide.webp` (3:2, wider screens). A picture with only one of the two shows only on screens of that shape. An optional `01-beach-figure.webp` (a transparent cut-out) is drawn over that picture and looks up each time the visitor scrolls back to the top. Scrolling away rests the slideshow on its first picture, so going back up always lands there. Its alt text is `HOME_HERO_ALT_BEACH` (the name without the number) in `brand/messages/<lang>.json`; without one it is decorative.

| File | What it does |
| :--- | :--- |
| `brand/home-actions.json` | The home page's "What can you do?" cards: per card an `icon` (camera, search, offer, services), `title` and `text` per language, and either an `href` or a `whatsapp` first message per language. Empty: the section doesn't show. |
| `brand/cutouts.json` | product slugs with a cut-out picture at `public/brand/products/cutout/<slug>.webp`. With at least 4, those products float in the opening scene instead of the hero picture |
| `brand/rings3d.json` | optional 3D recipes per product slug for the opening scene (three.js, loaded only then) |
| `brand/studio.mjs` | your own AI studio prompts: export any prompt of `lib/studio/prompts.mjs` under its name to replace the neutral one |
| `brand/admin-links.json` | the shop's own admin pages in the admin menu: `[{ "href": "/admin/x", "label": { "es": "…", "en": "…" } }]`, optionally `"after": "/admin/offers"` (its place in the menu) and `"icon"` (`grid`, `list`, `map-pin`) |

```env
BRAND_DECORATION=goldleaf           # dark background with a gold lamp breathing out smoke
BRAND_DECORATION=dunes              # or: soft drifting sand dunes and a low sun, in the theme colors
BRAND_LOADER_IMAGE=/brand/loader.png   # a picture that hops while pages load, instead of the turning ring
BRAND_CONTACT_IMAGE=/brand/loader.png  # the mascot waving hello in the contact pop-up (default: the loader picture)
BRAND_RING_CENTER=/brand/ring-center.svg  # middle of the category ring: band (gold band, default), none, or a picture shown as a turning 3D piece
BRAND_RING_FIGURE=/brand/ring-figure.svg  # a picture standing on that piece (e.g. a windmill), with BRAND_RING_FIGURE_SPINNER (sails turning with the ring) and BRAND_RING_FIGURE_AT=x,y
# more standing pictures (e.g. volcanoes): brand/ring-figures.json, a list of { image, at: { x, y }, scale }
SHOWCASE_MODE=true                  # no prices, no cart: visitors send "I'm interested" instead
SHOWCASE_SHOW_PRICES=true           # showcase with prices (classifieds); a product's contactPhone adds "Contact the seller"
```

### Features that switch on by themselves

| Feature | Appears when |
| :--- | :--- |
| Google login button | `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set |
| Contact page | at least one contact detail is set |
| Language switcher | more than one language is enabled |
| Light/dark switch | `BRAND_THEME=system`, or `BRAND_THEME=dark` + `BRAND_THEME_SWITCH=true` (dark first, switch in the menus) |
| AI product studio (`/admin/studio`) | `OPENAI_API_KEY` is set |
| "What can you do?" cards | `brand/home-actions.json` has cards |

### Products and content

Products, prices, stock, categories, banners and users are managed in the shop's **admin panel** (`/admin`), not in code. See `docs/SETUP.md` step 4 for the first admin account.

---

## 3. Put it online

**[docs/SETUP.md](docs/SETUP.md)** is the step-by-step guide: GitHub, Vercel, database, first admin, Google login, Stripe, PayPal, emails, image uploads, own domain and a final checklist. `/new-shop` in Claude Code guides you through the same steps.

---

## 4. Update customer shops

Every customer shop is its own repo with this template as `upstream`. Fixes and features are made **here**, then merged into each shop:

```shell
cd ../shop-acme
git fetch upstream
git merge upstream/main
npm install
git push                           # Vercel deploys, and migrations run on their own
```

Customers only differ in `.env`, `public/brand/` and `brand/messages/`, so this merges without conflicts. If a shop got a code change of its own, Claude can resolve the merge using the rules in `AGENTS.md`.

To make a shop's feature available to all shops, build it into the template as a setting and merge it down. Don't fork the code.

---

## 5. Commands

| Command | What it does |
| :--- | :--- |
| `npm run create-shop` | wizard: create a new customer shop |
| `npm run brand-colors -- <image>` | suggest shop colors from a logo or photo |
| `npm run make-admin -- <email>` | make an existing account an admin |
| `npm run push-env` | copy `.env` values to the linked Vercel project (`--only KEY1,KEY2` for some) |
| `npm run dev` / `build` / `start` | develop / build / run |
| `npm run lint` / `test` / `test:e2e` | lint / unit tests / end-to-end tests |
| `npm run storybook` | component explorer on :6006 |
| `npm run email` | email preview on :3001 |

---

## 6. Working on the template itself

- Keep everything customer-specific out of the code. A new customizable thing becomes an env var in `lib/brand.ts` (look) or `lib/constants` (rules), documented in `.env.example` and in this README.
- Use theme colors only (`bg-primary`, `text-muted-foreground`, `border-border`, …), never fixed colors. Otherwise light or dark shops break.
- New texts go into **all** `resources/*.json` files.
- `AGENTS.md` has the full rules for AI agents working on the template and the customer repos.
