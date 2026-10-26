# AGENTS.md: custom (white-label shop template)

The workspace guidelines in `../AGENTS.md` apply. This file adds the rules that keep customer shops updatable.

## Template vs. customer repos

- **This repo is the template.** Customer shops are clones of it, with this repo as their `upstream` remote.
- Customer-specific things live **only** in `.env`, `public/brand/` and `brand/messages/`. Never hardcode a name, color, image, contact, price rule or wording in code.
- Anything a shop might want to change becomes configuration:
  - an env var read in `lib/brand.ts` (brand/look) or `lib/constants` (shop rules)
  - documented in `.env.example`
  - with a sensible default
- Client components can't read non-`NEXT_PUBLIC_` env vars. Pass the value down from a server component, as `payment-method/page.tsx` does.

## Styling

- Use theme tokens only (`bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-primary`, …). They come from `assets/styles/globals.css` and are overridden per shop via `BRAND_COLOR_*`.
- No hardcoded colors like `bg-white/10`, `text-black`, or hex values in components. They break light or dark themes. Dark overlays on photos (`from-black/…`) are the exception.
- Emails can't use CSS variables. Use `EMAIL_COLORS` from `lib/brand.ts`.

## Checking front-end changes

- **Every change is checked in the browser, on desktop and on small screens.** After any front-end change, open the page in Google Chrome through the Claude in Chrome extension and check on `http://localhost:3000` that the change is really there and looks right.
- **Small screens are not optional:** check every page you touched at phone width (375px and 320px), including drawers, dialogs, popups and the states they can be in (e.g. one vs. several choices). Nothing may overlap, be cut off, run off the side or show the same label over and over.
  - Chrome windows don't go narrower than about 500px: put the page in iframes of 375px and 320px on a temporary local HTML page (not committed), or use the device toolbar.
- If the extension isn't connected or the dev server isn't running, say so and ask me to start it, and keep asking until it works. Never finish a front-end task without having seen it, and never report a visual change as checked without having seen it.

## Texts

- User-facing text goes through `getT()` / `useI18n()`. A new key must be added to **all** `resources/*.json` files.
- Use `{shop}` in a text for the shop name, and pass `{ shop: APP_NAME }` when translating.

## Creating shops

- `npm run create-shop` (`scripts/create-shop.mjs`) creates customer repos, and the `/new-shop` skill (`.claude/skills/new-shop/`) guides through it and the online setup in `docs/SETUP.md`.
- A new setting also belongs in the wizard when it's part of a shop's identity. Keep the README's "Customize everything" section and `docs/SETUP.md` in sync.

## Working in a customer repo (updates)

- Pull updates with `git fetch upstream && git merge upstream/main`. Then run `npm install` and `npx prisma migrate deploy`.
- When resolving conflicts, the template's code wins. The customer's `.env`, `public/brand/` and `brand/messages/` win.
- If a customer needs a change that isn't configurable yet, make it configurable **in the template**, then merge it down. Don't fork the code in the customer repo.
