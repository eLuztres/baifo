---
name: new-shop
description: Create and launch a new customer shop from the custom shop template, as a guided wizard. Collects the brand (optionally scanned from the customer's Instagram page via Claude in Chrome), creates the customer repo with the create-shop script, then walks through GitHub, Vercel, database, first admin, Google login, Stripe, PayPal, Resend, UploadThing and the domain, one step at a time. Use when the user wants a new customer shop/app/store, says "new customer", "create a shop for X", or runs /new-shop.
---

# New customer shop wizard

You are guiding the user through creating a shop and putting it online. Be a calm, clear wizard:

- **One step at a time.** Say which step of how many you're on. Wait until a step is done before starting the next.
- **Exact clicks and values.** The full click paths are in `docs/SETUP.md` of the template. Read the relevant section and give the user the concrete path and the exact values (URLs with the real domain filled in).
- **Every step can be skipped** and done later. The wizard can be resumed: the state is the shop's `.env` (filled vs. empty values).
- **Secrets:** when the user pastes a key, write it into the shop's `.env` with the Edit tool. Never repeat a secret back in chat. Never type secrets into websites yourself: dashboards are the user's to click. Values reach Vercel through `npm run push-env`.
- Use `AskUserQuestion` for choices, and ask plain questions for free text.

Paths: the template is the `custom` repo (this skill's repo). New shops go next to it: `../shop-<slug>`.

## Step 0: Resume or start

If the user names an existing shop folder, open its `.env`, see which services are still empty, and continue from the first unfinished step below. Otherwise:

1. In the template: `git status --porcelain`. If there are uncommitted changes, tell the user that only committed code goes into the new shop, and ask whether to continue.
2. `git remote get-url origin`. Without a remote, customer shops will pull updates from the local folder. Suggest pushing `custom` to GitHub first (fine to skip).
3. Check the tools: `vercel whoami` (logged in?) and `command -v gh`. Just note what's there. Missing tools only mean more manual steps.

## Step 1: The brand

Ask for the **shop name** and the **customer's Instagram URL** (optional). Then:

### 1a. From Instagram (if a URL was given)

Load the `claude-in-chrome` skill and its tools, open a **new tab**, and navigate to the profile.

1. Run the contents of `instagram-scan.js` (next to this file) with `javascript_tool`. It returns:
   - `headerText`: display name, bio, website
   - `description`
   - `profilePicture`: size, dominant and vivid colors
   - `posts`: dominant and vivid colors of the latest posts
   - `loginWall: true` means the user has to log into Instagram in that Chrome first. Tell them, wait, and retry.
2. Take a **screenshot** and look at the profile yourself. The numbers only support your eye.
   - **Main color:** usually the most characteristic *vivid* color that repeats across posts or the logo. Not the dominant background (often black or white).
   - **Theme:** `dark` if the feed and picture are mostly dark, otherwise `light`.
3. **Logo:** the profile picture. Ask permission first ("Download the Instagram profile picture as the logo? It goes to ~/Downloads"). Then run it in the page:
   ```js
   const img = document.querySelector('header img');
   const blob = await fetch(img.src).then((r) => r.blob());
   const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: '<slug>-logo.jpg' });
   document.body.append(a); a.click(); a.remove(); 'ok';
   ```
   Then use `~/Downloads/<slug>-logo.jpg`. If the download is declined or doesn't arrive, ask the user to save the picture themselves and give you the path.
4. Close your tab.
5. Proposals from the profile:
   - **description:** from the bio, one sentence, in the shop's main language
   - **instagram:** the handle
   - **website:** the link in the bio, if any. Ask whether it's the future shop domain.

### 1b. Confirm the look

Show a short summary and ask the user to confirm or change:

```
Name:        …
Description: …
Theme:       dark / light / system
Main color:  #……  (why: "magenta of the lamps in 4 of 6 posts")
Logo:        path / none (placeholder)
```

For a check without Instagram: `npm run brand-colors -- <logo file>` suggests colors from a logo.

### 1c. The rest

Ask in one go (`AskUserQuestion` where it fits):
- **Contact:** email, phone, WhatsApp yes/no, Instagram
- **Languages:** en, es, de, fr, it; the first one is the default
- **Currency:** default EUR
- **Payment methods:** PayPal, Stripe, CashOnDelivery

Optional wording (e.g. a custom hero title) goes into `texts`. Keys are in `resources/en.json`, e.g. `HERO_TITLE`, `FOOTER_TAGLINE`, `BRAND_DESCRIPTION`.

## Step 2: Create the shop

Write the answers to a JSON file in your scratchpad and run the wizard from the template folder:

```json
{
  "name": "Ocean Surf Co.",
  "slug": "shop-ocean-surf",
  "description": "Boards, wetsuits and gear for every wave.",
  "logo": "/home/…/Downloads/shop-ocean-surf-logo.jpg",
  "theme": "dark",
  "primaryColor": "#14B8A6",
  "contact": { "email": "…", "phone": "+34 …", "whatsapp": "+34 …", "instagram": "oceansurf" },
  "locales": ["es", "en"],
  "currency": "EUR",
  "paymentMethods": ["Stripe", "PayPal"],
  "showcase": false,
  "texts": { "es": { "HERO_TITLE": "…" } },
  "githubRepo": "",
  "install": true
}
```

```shell
npm run create-shop -- --config <file>
```

Other supported fields:
- `colors`: overrides single tokens, e.g. `{ "background": "#06141B" }`
- `backgroundColor`, `radius`, `icon`, `heroImage`, `showName` (false when the logo already contains the name)
- `taxRate`, `shippingPrice`, `freeShippingThreshold`, `serverUrl`
- `createGithubRepo` (needs `gh`)

Then show the result: `npm run dev` in the shop folder. It needs a `DATABASE_URL` for product pages, so a first look can wait until step 4.

## Step 3: GitHub

Follow `docs/SETUP.md` § 2.
- With `gh`: offer to create it (`gh repo create <slug> --private --source . --remote origin --push`).
- Without it: the user creates an empty private repo on github.com/new and gives you the URL. Then run `git remote add origin <url> && git push -u origin main`.

## Step 4: Vercel and database

`docs/SETUP.md` § 3:
1. The user imports the GitHub repo at vercel.com/new. **Don't deploy yet.**
2. The user adds the Neon database under Storage and connects it. Vercel sets `DATABASE_URL`.
3. In the shop folder: `vercel link` (interactive; tell the user to run `! vercel link` if it needs input). Then `vercel env pull .env.vercel` to get the production `DATABASE_URL`. Copy only `DATABASE_URL` into `.env`, then delete `.env.vercel`.
4. Set `NEXT_PUBLIC_SERVER_URL` in `.env` to `https://<project>.vercel.app`, or the real domain if it's already known.
5. `npm run push-env`, then `vercel --prod`. The first build runs the migrations. Confirm with the user before deploying.

## Step 5: First admin

`docs/SETUP.md` § 4. The user signs up on the live shop. Then run `npm run make-admin -- <email>` in the shop folder, and they sign out and in again.

## Steps 6–10: Services (ask which ones the shop needs)

For each chosen service:
1. Read its section in `docs/SETUP.md` and guide the user through the dashboard with the real domain filled in.
2. Receive the values, write them to `.env`, and push only those: `npm run push-env -- --only KEY1,KEY2`.
3. Redeploy: `vercel --prod`.

| Service | SETUP.md | Keys |
| :--- | :--- | :--- |
| Google login | § 5 | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| Stripe | § 6 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| PayPal | § 7 | `PAYPAL_CLIENT_ID`, `PAYPAL_APP_SECRET`, `PAYPAL_API_URL` |
| Resend | § 8 | `RESEND_API_KEY`, `SENDER_EMAIL` |
| UploadThing | § 9 | `UPLOADTHING_TOKEN` |
| Domain | § 10 | `NEXT_PUBLIC_SERVER_URL`, plus the Google/Stripe URLs |

Start payments in test/sandbox mode. Switch to live keys only when the user says the customer is ready.

## Step 11: Final check

Open the live shop in a new Chrome tab and check the look: logo, colors, texts, contact. Walk the user through the checklist in `docs/SETUP.md` § 11. The test payment is theirs to do: never enter card details yourself.

Finish with a summary:
- the shop URL and repo
- what's configured and what's still open
- how to update later: `git fetch upstream && git merge upstream/main` in the shop folder
