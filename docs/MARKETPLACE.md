# Baifo marketplace

Sellers only use WhatsApp: they send photos (and maybe a price), the AI makes the listing, you approve it on
WhatsApp, the seller pays a listing fee on `/publicar/<token>` and the product goes online for 3 months.
This code is Baifo's own and lives only in `lib/marketplace/`, `lib/whatsapp-cloud/`, `app/api/whatsapp/`,
`app/api/cron/` and `app/(root)/publicar/`, so template updates still merge cleanly.

## Flow

| Status | What happens |
| :--- | :--- |
| `COLLECTING` | The seller sends photos and texts; the bot offers a "✅ Listo" button |
| `PROCESSING` | Photos → UploadThing, AI photo (OpenAI image edit), AI title/description/category/price |
| `IN_REVIEW` | You get the listing on `ADMIN_WHATSAPP_NUMBER` with Aprobar / Editar / Rechazar. Edit by replying `precio 25`, `título …`, `desc …`, `cat …` |
| `AWAITING_PAYMENT` | The seller gets the `/publicar/<token>` link |
| `LIVE` | Paid: the product is online until `expiresAt` |
| `SOLD` / `EXPIRED` / `REJECTED` | Off the shop |

Seller commands: `ayuda`, `borrar` (start over), `vendido` (takes the newest live listing down).

The daily cron also takes listings down after `LISTING_DAYS` (the seller gets a WhatsApp a week before) and sends nothing twice.
A step that fails is retried by the daily cron (`vercel.json`, `/api/cron/marketplace`); after 3 failures you get a WhatsApp message.

## Settings (`.env` and Vercel)

```env
# Meta WhatsApp Cloud API (developers.facebook.com → your app → WhatsApp)
WHATSAPP_TOKEN=                 # permanent system user token
WHATSAPP_PHONE_NUMBER_ID=       # the Baifo number's id (not the number itself)
WHATSAPP_APP_SECRET=            # App settings → Basic; checks that webhooks come from Meta
WHATSAPP_VERIFY_TOKEN=          # any secret; the same one goes into the webhook settings
# WHATSAPP_GRAPH_VERSION=v23.0
ADMIN_WHATSAPP_NUMBER=34600000000   # your own number, without +: reviews and notifications go here

# Listings
LISTING_PRICE_NORMAL=5
LISTING_PRICE_BIG=10
LISTING_DAYS=90
LISTINGS_EMAIL=                 # gets the printable list of live products

# Payments of the listing fee (Stripe Checkout or PayPal); the product goes live on payment
STRIPE_SECRET_KEY=
STRIPE_LISTING_WEBHOOK_SECRET=  # a second Stripe webhook: https://baifo.es/api/webhooks/stripe-listing, event checkout.session.completed
PAYPAL_CLIENT_ID=
PAYPAL_APP_SECRET=
SHOWCASE_MODE=true              # no cart; buyers contact the seller
SHOWCASE_SHOW_PRICES=true

CRON_SECRET=                    # Vercel sends it to the cron route
OPENAI_API_KEY=                 # AI photo and text
```

Store categories: Baifo's defaults come from a migration (casa, moda, electronica, deporte, ninos, jardin, motor, otros). Listings whose category matches none go to "otros", because the showroom only shows categorized products.

Every new listing emails the printable list of live products (photo, price, WhatsApp, link) to `LISTINGS_EMAIL`.

Webhook URL in the Meta app: `https://baifo.es/api/whatsapp` (subscribe to `messages`).
