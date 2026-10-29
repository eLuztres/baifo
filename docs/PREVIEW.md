# Preview app: the showcase and every ticket online, never production

A second Vercel project, **baifo-showcase**, on the same GitHub repo. It has its own Neon database and its own
environment variables, so nothing it does reaches baifo.es, its database or real customers.

- Its production branch `main` (later `develop`, #185) is the showcase: `https://baifo-showcase.vercel.app`.
- Every pushed `card/<n>-…` branch gets a Preview URL in this project, with the same safe variables.

Why a second project and not the Preview deployments of `baifo`: there, `DATABASE_URL` and the WhatsApp secrets are
shared by Preview and Production, so a branch preview would write to the production database.

## Safety

| Rule | How |
| :--- | :--- |
| Own database | Neon database created for this project only; `vercel-build` migrates it |
| Password | `PREVIEW_PASSWORD`: every page asks for it (any user name) |
| Hidden from Google | `PREVIEW_PASSWORD` also sets `X-Robots-Tag: noindex`, a noindex meta tag and a robots.txt that disallows all |
| Payments | Stripe test keys (`pk_test_`/`sk_test_`) and `PAYPAL_API_URL=https://api-m.sandbox.paypal.com`, or none |
| No WhatsApp | No `WHATSAPP_*` variables: nothing can be sent |
| No emails | No `RESEND_API_KEY`: the email service only logs |

## Setting it up (once)

1. **Vercel → Add New → Project →** import the `shop-baifo` GitHub repo, name it `baifo-showcase`. Don't deploy yet
   (or let the first build fail, it has no database).
2. **baifo-showcase → Storage → Create Database → Neon** (free plan), connect it to *Production* and *Preview*.
   This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for this project only.
3. **baifo-showcase → Settings → Environment Variables**, for *Production* and *Preview*:
   - `PREVIEW_PASSWORD`: a shared password
   - `NEXT_PUBLIC_SERVER_URL=https://baifo-showcase.vercel.app`
   - `AUTH_SECRET` and `ENCRYPTION_KEY`: new ones (`openssl rand -base64 32`), never the production ones
   - The brand and shop rules from `.env`, without secrets. In a folder linked to the new project
     (`vercel link --project baifo-showcase`): `npm run push-env -- --only APP_NAME,BRAND_THEME,…`.
     Never push the whole `.env`: it holds the WhatsApp token.
4. **Redeploy** `main` in baifo-showcase.
5. **Copy the showcase** from the local database into the new one (Neon → Connection string):
   `npm run showcase-copy -- --to "<Neon URL>"`, check the counts, then add `--apply`.
   It refuses any database with listings that aren't `vitrina-…`, so it can't write to production.
   `--remove` deletes the showcase listings there again.
6. **baifo → Settings → Git → Ignored Build Step**, so the production project stops building branch previews against
   its database: `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`.

## What the password doesn't cover

The middleware skips `/api`, `/_next/static` and image/video files. So the sample pictures and the API routes
(sign-in, webhooks, uploads) answer without the password. They still carry `X-Robots-Tag: noindex`, and the
preview holds only sample data.
