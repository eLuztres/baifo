# Card #48: Renew a listing by paying again

## What changed

- **WhatsApp:** the reminder a week before the end and the "ended" message now link to the seller's private page `/publicar/<token>` instead of asking for the photos again (all 5 languages). The `listing_expiring` template gets a 3rd value, the link.
- **Seller page, live listing:** says "Online until <date>" and shows a **Renew it** block: the plan's price for another `LISTING_DAYS`, with the same Bizum code, El Corral details and "I've done the Bizum" / "I'll come to El Corral" buttons as the first payment.
- **Seller page, ended listing:** if the listing was paid once, the page stays open, says when it ended and that its photos and text are kept, and shows the same renew block. Unpaid listings that ended still show "link no longer active".
- **Admin editor:** live and ended listings of a person with WhatsApp get a **Renovación** payment section with the usual **Pagado** button (method + amount). Only a claim made after the last payment is shown there.
  - Live: online `LISTING_DAYS` past its current end (from today if that date has passed), the reminder is reset, the product's end moves too, and the seller gets "Renewed, online until …".
  - Ended: comes back online for a new period through the same path as **Enable again**, and the seller gets the usual "online" message.
  - Both book the fee in `ListingFee`. Two taps at the same moment renew once; a later tap counts as a new payment.
- Renewals are Bizum or cash only: the Stripe/PayPal webhooks only know first payments.

## Why

Sellers had to send all their photos again to keep a listing online. Now they pay again and the listing keeps its pictures and texts.

## How to test by hand

1. Open a **live** paid listing's private link `/publicar/<token>`: it says until when it is online and shows the renew block. Tap "I've done the Bizum".
2. Open that listing in the admin editor: the **Renovación** section shows the claim. Tap **Pagado**. The end date moves `LISTING_DAYS` further, a row appears in the fees, and the seller gets a WhatsApp.
3. Take a paid listing past its end (or let the cron expire it), open its private link: it says it ended and shows the renew block. Tap **Pagado** under Renovación in the editor: it is online again.
4. An unpaid listing that ended: its link still says it's no longer active.
5. Check the seller page at 375px and 320px.
6. In WhatsApp Manager, add `{{3}}` (the link) to `listing_expiring` in every language.
