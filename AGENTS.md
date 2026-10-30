# AGENTS.md: custom (white-label shop template)

The workspace guidelines in `../AGENTS.md` apply. This file adds the rules that keep customer shops updatable.

## El Baifo values (CRITICAL)

Every feature, text, flow and AI prompt in this shop must follow these values. If a change would go against them, say so and ask me first. The Spanish original is in `README.md`.

**Core idea.** El Baifo is an organic social network: a network of people, encounters and connections, with a digital tool that makes publishing easier. Technology serves people and their relationships; it doesn't replace meeting in person. We want to get back something simple: look at each other, introduce ourselves, shake hands and ask "what do you need? how can I help?". We're also connected by the wish to live Fuerteventura as the paradise we once chose.

**Values**

1. **People first.** We create spaces to meet, share ideas and connect with creative people.
2. **Simplicity.** If there are several ways to do something, we choose the easiest to understand and use.
3. **Direct, clear dealings.** Each person publishes their listing and decides how they want to be contacted. Baifo makes the encounter easier; people handle their own exchange.
4. **Privacy and autonomy.** Each person decides what information they share. The phone number is optional, published only with permission, and can be removed. We don't ask for email, tax, bank or personal data the listing doesn't need.
5. **Human, independent corrales.** Corrales are concrete places where you can find a person. They all start from a common base and each decides which extra services it offers. The person chooses whether to use them and agrees the terms directly with that corral.
6. **Clear terms.** A listing has a set price and period. Working with a corral is paid per publication or agreed service, never as a percentage of a sale.
7. **Individual responsibility.** Baifo makes publishing and connecting easier. Each person decides how to continue the conversation and is responsible for their agreements, calls and sales.
8. **Creativity and enjoyment.** We want people to create, share and take part because they enjoy it, without turning every encounter into a duty to sell, produce or earn money.
9. **Technology serving people.** AI can help create or improve materials when the person decides so. The decision and control stay with whoever publishes.
10. **Community and leisure.** Apañadas and meetups are for collecting listings, getting to know each other and spending some relaxed time together.

**Words that represent El Baifo** (in Spanish texts): personas · encuentro · conexión · corral · apañada · colaboración · creatividad · sencillez · autonomía · claridad · privacidad · disfrute · intercambio directo

**Never write or build** (in any language):
- "Win customers" / "generate leads" ("captar clientes", "generar leads").
- "Monetize people" or "earn a percentage of every sale".
- "We guarantee you'll sell" or "we close the deal for you".
- "You have to renew" or pushy messages to publish again.
- "Complete your profile" or requests for data the listing doesn't need.
- AI presented as a replacement for judgment, creativity or human contact.

**Guiding sentence:** El Baifo connects people. Each one decides what they share, how they relate and what agreements they want to reach.

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
