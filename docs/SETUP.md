# Setting up a customer shop online

This guide takes a new shop from "created by the wizard" to "live with payments". Do the steps in order. Each one ends with the `.env` values it produces.

> In Claude Code, `/new-shop` walks you through all of this interactively and fills in `.env` for you.

| # | Step | Needed? | Time |
| :-- | :--- | :--- | :--- |
| 1 | [Create the shop](#1-create-the-shop) | yes | 2 min |
| 2 | [GitHub repo](#2-github-repo) | yes | 2 min |
| 3 | [Vercel project + database](#3-vercel-project--database) | yes | 10 min |
| 4 | [First admin](#4-first-admin) | yes | 2 min |
| 5 | [Google login](#5-google-login) | optional | 10 min |
| 6 | [Stripe (cards)](#6-stripe-cards) | if you take cards | 10 min |
| 7 | [PayPal](#7-paypal) | if you take PayPal | 10 min |
| 8 | [Emails (Resend)](#8-emails-resend) | recommended | 10 min |
| 9 | [Image uploads (UploadThing)](#9-image-uploads-uploadthing) | to add products | 5 min |
| 10 | [Own domain](#10-own-domain) | optional | 10 min |
| 11 | [Final check](#11-final-check) | yes | 5 min |

---

## 1. Create the shop

From the `custom` folder:

```shell
npm run create-shop
```

It asks for the name, logo, colors, contact details and languages. It then creates `../shop-<name>` with a filled-in `.env` (secrets included) and the brand files, already committed.

## 2. GitHub repo

1. Go to <https://github.com/new>, name it like the folder (e.g. `shop-acme`), set it **Private**, and **don't** add a README.
2. In the shop folder:
   ```shell
   git remote add origin git@github.com:<you>/shop-acme.git
   git push -u origin main
   ```

With the GitHub CLI (`sudo apt install gh`, then `gh auth login`), the wizard does this for you.

## 3. Vercel project + database

**Project**

1. <https://vercel.com/new> → **Import** the shop's GitHub repo.
2. Framework: Next.js is detected automatically. Don't change the build command: `npm run vercel-build` runs the database migrations and then builds.
3. **Don't deploy yet.** Open *Environment Variables* first, or just deploy and let it fail once. That's fine.

**Database (Neon Postgres, free tier is enough to start)**

1. In the Vercel project: **Storage** → **Create Database** → **Neon** → region close to the customers → **Create**.
2. Connect it to the project. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically. The build uses the unpooled one for migrations.
3. Copy the `DATABASE_URL` into your local `.env` too. Then `npm run dev` works against the same data. For a separate test database, create a Neon branch.

**Environment variables**

Add every filled-in value from the shop's `.env` in **Settings → Environment Variables** (Production + Preview), except `DATABASE_URL*`, which Vercel already set. The fast way, from the shop folder:

```shell
vercel link                      # pick the project you just created
# then for each variable:
printf '%s' 'value' | vercel env add NAME production
```

Two values change for production:

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SERVER_URL` | `https://<project>.vercel.app`, or the own domain later |
| `PAYPAL_API_URL` | `https://api-m.paypal.com` once PayPal is live (step 7) |

Then **Deployments → Redeploy**. Changing `NEXT_PUBLIC_*` values always needs a redeploy; other values apply on the next deploy as well.

## 4. First admin

1. Open the shop and **sign up** with the customer's email.
2. From the shop folder, with the production `DATABASE_URL` in `.env`:
   ```shell
   npm run make-admin -- customer@example.com
   ```
3. Sign out and in again. **/admin** now shows the admin panel.
4. Set `OWNER_EMAIL` to the same email in Vercel. Then only the owner can make or remove admins, and no other admin can lock them out. If another admin ever deletes the owner's account or takes away its admin rights anyway (e.g. before `OWNER_EMAIL` was set), the owner gets it back from the shop folder:
   ```shell
   vercel env run -e production -- npm run make-admin -- customer@example.com
   ```
   It makes the account admin again, or creates it again as admin if it was deleted; then sign in with Google using that email.
5. Optional, for a shop where nobody signs up alone: set `SIGN_UP_BY_INVITE=true` in Vercel now that the admin exists. From then on, accounts come only from the invite links the admin creates in **Admin → Users**.

## 5. Google login

Skip this step and the Google button simply doesn't show.

1. <https://console.cloud.google.com> → create a project (e.g. "Acme Shop").
2. **Google Auth Platform → Branding**: app name = shop name, support email, logo (optional), homepage `https://<domain>`, privacy policy `https://<domain>/privacy`, authorized domain `<domain>`. Fill in `IMPRINT_TEXT` (and check `PRIVACY_TEXT`) in `brand/messages/` first.
3. **Audience**: *External* → **Publish app** (otherwise only test users can log in).
4. **Clients → Create client** → *Web application*:
   - Authorized JavaScript origins: `https://<domain>` and `http://localhost:3000`
   - Authorized redirect URIs: `https://<domain>/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
5. Copy the values:

| Variable | From |
| :--- | :--- |
| `AUTH_GOOGLE_ID` | Client ID |
| `AUTH_GOOGLE_SECRET` | Client secret |

When the domain changes, add the new origin and redirect URI there as well.

## 6. Stripe (cards)

1. <https://dashboard.stripe.com> → create an account for the customer (or a new account in yours).
2. Start in **Test mode**. **Developers → API keys**:

| Variable | From |
| :--- | :--- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key `pk_…` |
| `STRIPE_SECRET_KEY` | Secret key `sk_…` |

3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<domain>/api/webhooks/stripe`
   - Event: `charge.succeeded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
4. Test with card `4242 4242 4242 4242`, any future date, any CVC. The order must switch to *Paid*.
5. Going live: activate the account, then repeat steps 2–3 in live mode. Keys and webhook are separate there.

Remove `Stripe` from `PAYMENT_METHODS` if the shop doesn't take cards.

## 7. PayPal

1. <https://developer.paypal.com> → **Apps & Credentials** → *Sandbox* → **Create App**.

| Variable | From |
| :--- | :--- |
| `PAYPAL_CLIENT_ID` | Client ID |
| `PAYPAL_APP_SECRET` | Secret |
| `PAYPAL_API_URL` | `https://api-m.sandbox.paypal.com` (sandbox) / `https://api-m.paypal.com` (live) |

2. Test with a sandbox buyer account (**Testing Tools → Sandbox Accounts**).
3. Going live: switch the toggle to *Live*, create the app there, and replace all three values. The customer's PayPal business account must accept the shop currency.

Remove `PayPal` from `PAYMENT_METHODS` if not used.

## 8. Emails (Resend)

These are the welcome email and order receipts.

1. <https://resend.com> → **Domains → Add domain** → add the DNS records at the domain provider → wait for *Verified*.
2. **API Keys → Create** (sending access):

| Variable | Value |
| :--- | :--- |
| `RESEND_API_KEY` | `re_…` |
| `SENDER_EMAIL` | e.g. `shop@acme.com` (on the verified domain) |
| `ORDER_ALERT_EMAIL` | optional: who gets an email for every new order, e.g. `owner@gmail.com` (defaults to `CONTACT_EMAIL`). Admins can override it, turn emails off or add WhatsApp alerts (via CallMeBot) under Admin › Overview › Notifications |
| `CONTACT_EMAIL` | where customer replies should go |

Without a verified domain, Resend only delivers to your own address. That's fine for testing.

## 9. Image uploads (UploadThing)

Needed to upload product images in the admin panel.

1. <https://uploadthing.com> → **Create app** (one per shop keeps files apart).
2. **API Keys** → copy the token into `UPLOADTHING_TOKEN`.

Optional: the **AI product studio** (`/admin/studio`) turns one product photo into shop pictures and texts. Create a key at <https://platform.openai.com/api-keys> and set `OPENAI_API_KEY` (each picture costs a few cents). Without it, "New product" opens the plain product form.

## 10. Own domain

1. Vercel project → **Settings → Domains → Add** → follow the DNS instructions.
2. Update, then redeploy:
   - `NEXT_PUBLIC_SERVER_URL=https://<domain>`
   - the Google origins and redirect URIs (step 5)
   - the Stripe webhook URL (step 6)

## 11. Final check

- [ ] Home, shop and product pages show the right logo, colors and texts
- [ ] Sign up works, and a welcome email arrives
- [ ] Google login works (if configured)
- [ ] Admin: create a product with an uploaded image
- [ ] Test order with Stripe `4242…` → order becomes *Paid*, receipt email arrives
- [ ] Test order with PayPal sandbox (if configured)
- [ ] Contact page and footer show the right contact details
- [ ] Switch to live payment keys when the customer is ready
