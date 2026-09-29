# Custom Shop Template

A white-label e-commerce shop (Next.js 15, Prisma/PostgreSQL, next-auth, Stripe/PayPal).
It has products, cart, checkout, orders, user accounts and an admin panel. Every customer shop runs **the same code**.
The name, logo, colors, contact details, languages, currency and pricing rules all come from configuration.

## Quick start

```shell
npm install
cp .env.example .env          # then fill in DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY, …
npx prisma migrate deploy
npx tsx db/seed.ts            # sample products + admin@example.com / 123456 (fresh databases only: it wipes them)
npm run dev
```

Change the seeded admin password right away, or create your own admin user.

## What makes a shop "one customer's shop"

A customer shop only ever changes these three places. The template never touches them after creating them, so updates merge cleanly.

| Where | What |
| :--- | :--- |
| `.env` | Name, description, theme, colors, radius, contact info, languages, currency, tax/shipping, payment methods, API keys. See `.env.example` for every option. |
| `public/brand/` | `logo.svg`, `icon.svg`, and optional hero/og images and a display font. |
| `brand/messages/<lang>.json` | Wording overrides per language, any key from `resources/en.json`, e.g. `{ "HERO_TITLE": "Ride every wave", "FOOTER_TAGLINE": "…" }`. |

Brand settings are read at request time. Restart the server to apply them; only `NEXT_PUBLIC_*` values need a rebuild.

## Customer repos and updates

Every customer gets its own repo, created from this template and kept connected to it:

```shell
# Create a customer shop
git clone <custom-repo-url> shop-acme
cd shop-acme
git remote rename origin upstream              # the template
git remote add origin <acme-repo-url>          # the customer's own repo
cp .env.example .env                           # configure the brand
# replace public/brand/*, add wording to brand/messages/*.json
git add public/brand brand && git commit -m "Acme branding"
git push -u origin main
```

```shell
# Pull template updates (bug fixes, features) into a customer shop
git fetch upstream
git merge upstream/main
npm install && npx prisma migrate deploy
```

Because customers only differ in the brand files and `.env`, merges don't conflict. If a customer needed a real code change, an AI agent can resolve the merge. See `AGENTS.md` for the rules it follows.

Put fixes and features in **this template** first, then merge them into the customer repos. Don't fix them in one customer repo.

## Commands

```shell
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint
npm run test       # Jest (the PayPal tests need sandbox credentials)
npm run storybook  # Storybook on :6006
npm run email      # email preview on :3001
```
