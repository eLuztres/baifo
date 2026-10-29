# Baifo marketplace

Sellers only use WhatsApp: they send photos (and maybe a price), the AI makes the listing, you approve it on
WhatsApp, the seller pays a listing fee on `/publicar/<token>` and the product goes online for 3 months.
This code is Baifo's own and lives only in `lib/marketplace/`, `lib/whatsapp-cloud/`, `app/api/whatsapp/`,
`app/api/cron/` and `app/(root)/publicar/`, so template updates still merge cleanly.

## Flow

| Status | What happens |
| :--- | :--- |
| `COLLECTING` | The bot welcomes like the quick replies (`docs/whatsapp-quick-replies.md`): a list of the four types (or a typed 1–4 / "busco", "clase" …), then that type's checklist. The seller sends photos and texts; the bot offers a "✅ Listo" button. An item for sale needs a photo; Busco, Servicio and Evento can go from words alone (the AI makes the picture). A photo sent before choosing counts as an item for sale |
| `PROCESSING` | Photos → UploadThing, AI photo (OpenAI image edit), AI title/description/category/price |
| `IN_REVIEW` | You get the listing on `ADMIN_WHATSAPP_NUMBER` with Aprobar / Editar / Rechazar. Edit by replying `precio 25`, `título …`, `desc …`, `cat …` |
| `AWAITING_PAYMENT` | The person gets the private `/publicar/<token>` link (valid `UNPAID_LISTING_HOURS`): a preview of the listing without any contact, where they give their OK to show their number (`consentAt`) and see how to pay (Bizum with their code, e.g. `BAIFO-7Q2K`, or cash at the Corral). "Ya he hecho el Bizum" / "Pasaré por El Corral" only notes it (`payClaimedAt`) for the admin. Premium is shown as "coming soon" and can't be chosen. In "Who offers it" they can set a name or nickname (`sellerName`) and the language buyers write to them in (`sellerLocale`), also once live |
| `LIVE` | Paid (the admin taps **Pagado**, or a card payment): the fee is booked in `ListingFee` and the product is online until `expiresAt` |
| `SOLD` / `EXPIRED` / `REJECTED` | Off the shop |

Seller commands: `ayuda`, `borrar` (start over), `vendido` (takes the newest live listing down).

The daily cron also takes listings down after `LISTING_DAYS` (the seller gets a WhatsApp a week before) and sends nothing twice. Listings never paid expire `UNPAID_LISTING_HOURS` after their link was sent (`sentAt`). An expired listing keeps its pictures and texts: **Enable again** in its editor brings it back (online for a new `LISTING_DAYS` if it was live, waiting for payment if it never was).
**Renewal:** the reminder and the "ended" message link to the seller's `/publicar/<token>` page. While the listing is live, and after it ended if it was paid once, the page offers another `LISTING_DAYS` for the plan's price (Bizum or cash only; the card webhooks only know first payments). The admin taps **Pagado** under "Renovación" in the editor: the fee is booked in `ListingFee`, a live listing stays online `LISTING_DAYS` past its current end (from today if that has passed), and an ended one comes back for a new period with the same photos and texts.
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
UNPAID_LISTING_HOURS=48         # the private link of an unpaid listing works this long after it was sent, then it expires
LISTINGS_EMAIL=                 # gets the printable list of live products
# ADDRESS_AREA=-14.55,27.99,-13.80,28.78  # the area npm run island-addresses takes event addresses from (west,south,east,north); default Fuerteventura

# How people pay the listing fee on their page: stripe, paypal, bizum, cash. For now Bizum and cash only (no card papers yet);
# the admin taps "Pagado" in the editor when the money is there. Card payments put the product live by themselves.
LISTING_PAYMENT_METHODS=bizum,cash
BIZUM_PHONE=600000000           # the number shown for Bizum; blank: no Bizum
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

Listing types (`Product.type`, `ListingType`): **Producto** (fixed price), **Busco** (`WANTED`, budget range), **Servicio** ("desde" price, optional, plus Clase / Servicio / Acompañamiento) and **Evento** (date and time, address, entry price where 0 is "Gratis"; uses the organiser's own photos). Type and category are independent, like in a newspaper: any type goes in any category. The AI picks both; from WhatsApp it tells an item for sale from a "Busco". The feed (`/explore`) has one search field that filters as you type (`?q=…`, over names, descriptions and category names in every language) and one row of chips: Todo (clears everything), Hoy, the types (`?tipo=servicios`) and the categories (`?c=…`), combinable; tapping a chosen chip again drops just that one. An event shows "Jueves 29/11 · 19:00" or "Hoy · 19:00" and leaves the shop by itself the day after; the feed's "Hoy" chip (`/explore?hoy`) shows today's events.

Every new listing emails the printable list of live products (photo, price, WhatsApp, link) to `LISTINGS_EMAIL`.

Webhook URL in the Meta app: `https://baifo.es/api/whatsapp` (subscribe to `messages`).

## WhatsApp templates (24-hour window)

WhatsApp only delivers free messages within 24 hours of the person's last message. When Meta answers 131047 (window
closed), the bot sends the approved template of the same name instead, with the message's texts as body parameters
(`lib/marketplace/templates.ts`). Templates go to the person's language (`es`, `en`, `it`, `fr`, `de`); a language
that isn't approved falls back to `es`. A template that fails too is only logged. Create them in WhatsApp Manager
(category Utility; "Spanish" = `es`, "English" = `en`, …). Parameters can't hold line breaks, so they are joined with " · ".

| Template | Languages | Body parameters | Buttons |
| :--- | :--- | :--- | :--- |
| `review_request` (to the admin) | `es` | {{1}} title, {{2}} price, {{3}} category, {{4}} description | 3 quick replies: Aprobar, Editar, Rechazar (in this order) |
| `payment_link` (the private link) | all, at least `es` | {{1}} link, {{2}} hours it works | – |
| `listing_live` | all, at least `es` | {{1}} days online, {{2}} product link | – |
| `admin_new_listing` (to the admin) | `es` | {{1}} title, {{2}} plan (Normal/Grande), {{3}} link, {{4}} also post on (Facebook, Wallapop or —) | – |
| `listing_expiring` | all, at least `es` | {{1}} title, {{2}} end date, {{3}} renewal link | – |

## Admin pages

- **/admin/listings**: every listing by status (to review first), with photo, price, seller and end date.
- **/admin/listings/new**: one or several photos, optionally a few words, a price and the seller's WhatsApp → "Crear con IA" (or "Continuar" with the photos as they are; photos keep uploading while the admin goes on) → straight to the description while the AI already makes the pictures; "¿Cómo quieres el texto?" picks **Mejorar con IA** (the AI writes it), **Solo corregir errores** (the admin's words with only spelling and grammar fixed, then translated) or **Mi texto tal cual** (word for word, only translated); the editor's IA · Corregido · Original switch changes it later, making a missing version once → the AI writes title, descriptions, category and price at the same time as the pictures (progress shown per part; the editor opens once both are there) → edit → "Publicar ahora" (free) or "Rechazar".
- **/admin/listings/[id]**: the same editor for any listing, plus reject and mark as sold. With the person's WhatsApp: **Lista: enviar a la persona** opens your own WhatsApp (`wa.me`) with the message and the private link, in the person's language (no Cloud API); later **Reenviar enlace** sends it again and restarts the time. The person's WhatsApp can be changed under "Más opciones" until it goes live; a new number clears the recorded consent. The seller's name or nickname and language are there too, changeable any time. While it waits for payment: whether and how the person agreed to show their number, whether they say they paid, their code and amount, and **Pagado** (Bizum / Efectivo, amount) which books the fee and publishes. **Pagado** and **Publicar ahora** stay locked for a listing with a number until the person agreed (on their page, or tick "La persona aceptó por WhatsApp" after they answered SÍ).
- **/admin/payments**: every listing fee received (date, listing, method, amount) and the total, for the books.
- **Seller name and language:** the listing page shows "Offered by <name>" above Contact, and the WhatsApp message to the seller is written in their language. Empty name: their WhatsApp profile name; empty language: their number's country. A listing without a number (Baifo's own) shows no name unless the admin sets one. A name can't hold links or phone numbers (max. 30 letters).
- WhatsApp Business quick replies for taking listings by hand: `docs/whatsapp-quick-replies.md`.

The admin menu links come from `brand/admin-links.json`.
