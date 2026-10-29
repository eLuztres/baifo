# Baifo marketplace

Sellers only use WhatsApp: they send photos (and maybe a price), the AI makes the listing, you approve it on
WhatsApp, the seller pays a listing fee on `/publicar/<token>` and the product goes online for 3 months.
This code is Baifo's own and lives only in `lib/marketplace/`, `lib/whatsapp-cloud/`, `app/api/whatsapp/`,
`app/api/cron/` and `app/(root)/publicar/`, so template updates still merge cleanly.

## Flow

| Status | What happens |
| :--- | :--- |
| `COLLECTING` | The bot welcomes like the quick replies (`docs/whatsapp-quick-replies.md`): a list of the four types (or a typed 1–4 / "busco", "clase" …), then that type's checklist. The seller sends photos and texts; the bot offers a "✅ Listo" button. An item for sale needs a photo; Busco, Servicio and Evento can go from words alone (the AI makes the picture). A photo sent before choosing counts as an item for sale |
| `PROCESSING` | Photos → UploadThing, AI photo (OpenAI image edit), AI title/description/category/price; then each video gets an ffmpeg clean-up (steadier, less noise, even light and loudness), kept next to the original. A clean-up that fails or takes over 150 s keeps the original video. Listings made without AI keep their videos as uploaded |
| `IN_REVIEW` | You get the listing on `ADMIN_WHATSAPP_NUMBER` with Aprobar / Editar / Rechazar. Edit by replying `precio 25`, `título …`, `desc …`, `cat …` |
| `AWAITING_PAYMENT` | The person gets the private `/publicar/<token>` link (valid `UNPAID_LISTING_HOURS`): a preview of the listing without any contact, where they give their OK to show their number (`consentAt`) and see how to pay (Bizum with their code, e.g. `BAIFO-7Q2K`, or cash at the Corral). "Ya he hecho el Bizum" / "Pasaré por El Corral" only notes it (`payClaimedAt`) for the admin. Premium is shown as "coming soon" and can't be chosen. In "Who offers it" they can set a name or nickname (`sellerName`) and the language buyers write to them in (`sellerLocale`), also once live |
| `LIVE` | Paid (the admin taps **Pagado**, or a card payment): the fee is booked in `ListingFee` and the product is online until `expiresAt` |
| `SOLD` / `CANCELLED` / `FINISHED` / `EXPIRED` / `REJECTED` | Off the shop. Only `LIVE` listings are in the shop, without badges for other states. `FINISHED`: the daily cron takes an event down the day after its date, without a message and without renewal. `EXPIRED` covers both a time that ran out and a link never paid |
| `HIDDEN` | Taken off the shop by the admin for a while (**Ocultar**) |

Seller commands: `ayuda`, `borrar` (start over), `vendido` or `encontrado` (takes the newest live listing down).

The daily cron also takes listings down after `LISTING_DAYS` (the seller gets a WhatsApp a week before) and sends nothing twice. Listings never paid expire `UNPAID_LISTING_HOURS` after their link was sent (`sentAt`). An expired, sold, cancelled, rejected or hidden listing keeps its pictures and texts: **Activar de nuevo** / **Volver a publicar** / **Mostrar de nuevo** in its editor brings it back (online for a new `LISTING_DAYS` if it was paid, waiting for payment if it never was).
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

Listing types (`Product.type`, `ListingType`): **Producto** (fixed price), **Busco** (`WANTED`, budget range, or only "hasta 60 €" with an empty "Desde"), **Servicio** ("desde" price, optional, plus Clase / Servicio / Acompañamiento) and **Evento** (date and time, address, entry price where 0 is "Gratis"; uses the organiser's own photos). Type and category are independent, like in a newspaper: any type goes in any category. The AI picks both; from WhatsApp it tells an item for sale from a "Busco". The feed (`/explore`) has no text search. A small turning ring at the top chooses one thing at a time: Todo, Hoy (`?hoy`, today's events), Terminan pronto (`?pronto`, listings that go offline within `ENDING_SOON_DAYS`), Eventos (`?tipo=eventos`) and the categories (`?c=…`). Without a choice it shows rows that swipe sideways (Hoy, Terminan pronto, Eventos, then each category), each with "see all". A row with fewer than 4 listings (`MIN_FULL_LISTINGS`, `lib/explore-rows.ts`) isn't shown alone: those listings go together in one grid, "Más anuncios" (or "Todos los anuncios" when no row is full), without "see all". A choice with fewer than 4 listings shows its own first, then "Más anuncios" with up to 12 other live listings. The home ring's "Ver todo en …" link only shows when its row doesn't already show every listing. No title above the ring and no listing counts on the page: the choice is named once, under the ring's middle. On a choice a round "←" button with "Todo" sits left of the ring (after the "↑" home arrow) and goes back to everything; the ring itself then holds only the choices. An event shows "Jueves 29/11 · 19:00" or "Hoy · 19:00" and leaves the shop by itself the day after; the feed's "Hoy" chip (`/explore?hoy`) shows today's events.

Contact: "Contactar" on a listing with a seller number opens a pop-up (the `BRAND_CONTACT_IMAGE` mascot waving, else the loader picture or a 👋) with an optional nickname, remembered on that phone. Two icon buttons: the phone calls the seller (`tel:`), WhatsApp opens `wa.me` with the message written in the listing's language (the seller's, from their number's country code; else the shop's), worded for the listing type (`CONTACT_MESSAGE_*`), with the title and link. An empty nickname writes it without a name. The number is only fetched when the pop-up opens.

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
- **/admin/listings/new**: one or several photos, optionally a few words, a price and the seller's WhatsApp → "Crear con IA" (or "Continuar" with the photos as they are; photos keep uploading while the admin goes on) → straight to the description, still on this page (`?anuncio=<id>`, so the menu stays on "Nuevo anuncio" and a reload keeps the listing), while the AI already makes the pictures; "¿Cómo quieres el texto?" picks **Mejorar con IA** (the AI writes it from the seller's words: same facts and tone, never describing the photo or judging the item's condition), **Solo corregir errores** (the admin's words with only spelling and grammar fixed, then translated) or **Mi texto tal cual** (word for word, only translated); the editor's IA · Corregido · Original switch changes it later, making a missing version once → the AI writes title, descriptions, category and price at the same time as the pictures (progress shown per part; the editor opens once both are there) → edit → "Publicar ahora" (free). The whole creation stays on this page, with "Nuevo anuncio" highlighted.
- **/admin/listings/[id]**: the same editor for any listing, plus a **type switch** at the top (Producto · Busco · Servicio · Evento) in every state: switching shows the new type's fields and keeps the others in the form until saving; Save checks the edit for the new type, clears what doesn't fit it (condition, date, address, kind of offer, budget range) and updates the live listing's badges and "sold" words. A live, paid listing asks first (the fee stays the same). The top holds only the status and the type switch. All actions end the page, after the last field: **Activar de nuevo** / **Volver a publicar** / **Mostrar de nuevo** with its hint (when it applies), mark as sold (on an event **Terminado / cancelado**, which ends it as cancelled; asks first) and **Eliminar para siempre** last (for every status; asks first, then back to the list). The editor no longer offers Ocultar, Crear otro anuncio or Ver anuncio (the last two stay on the "published" screen). The **Nueva foto** tile after the photos (while there is room for more, up to 12) offers **Subir foto** (the admin's own photos and videos, uploaded like on the new-listing form, kept as originals without the AI switch, saved with the Save button) and **Foto con IA**. The photos go in any order: drag one (on a phone, press and hold it first) or focus it and use the arrow keys; the first is the main photo (the cover), and a video without a still frame springs back instead of going first. Each field's label shows whether it is set (✓, ✨ when it came from the description), missing, or needed to publish (dashed outline). **Rellenar lo que falta desde la descripción** reads the description again and fills only the empty fields (date, address, entry, place, price, condition, budget, service type, category), never what was set by hand and never anything the text doesn't say. **Crear foto con IA** needs a description, words in its own box or an uploaded photo; without any of them it stays off with a short note. It ends after Place with the WhatsApp/consent/payment box and the actions; the seller's number, name, language and the original photos aren't edited here, and saving keeps them as they are. Reject a listing from the WhatsApp review message. With the person's WhatsApp: **Lista: enviar a la persona** opens your own WhatsApp (`wa.me`) with the message and the private link, in the person's language (no Cloud API); later **Reenviar enlace** sends it again and restarts the time. While it waits for payment: whether and how the person agreed to show their number, whether they say they paid, their code and amount, and **Pagado** (Bizum / Efectivo, amount) which books the fee and publishes. **Pagado** and **Publicar ahora** stay locked for a listing with a number until the person agreed (on their page, or tick "La persona aceptó por WhatsApp" after they answered SÍ).
- **Pencil on the listing page:** an admin sees a small pencil beside the title (next to Share) on every listing page, straight to its `/admin/listings/[id]` editor; old shop products without a listing open `/admin/products/[id]`. Nothing floats over a listing: the "+" is hidden there.
- **/admin/payments**: every listing fee received (date, listing, method, amount) and the total, for the books.
- **Seller name and language:** the listing page shows "Offered by <name>" above Contact, and the WhatsApp message to the seller is written in their language. Empty name: their WhatsApp profile name; empty language: their number's country. A listing without a number (Baifo's own) shows no name. A name can't hold links or phone numbers (max. 30 letters).
- WhatsApp Business quick replies for taking listings by hand: `docs/whatsapp-quick-replies.md`.

The admin menu links come from `brand/admin-links.json`.
