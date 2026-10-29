# Card 355: Admin: remove "Listings by email"

## What changed

- **Card gone from `/admin/listings`**: no more email field, "Also send it after every new listing" switch or "Send list now" button. "New listing" / "New service" now sit right above the type filters.
- **No automatic send**: a listing going live (`goLive` in `lib/marketplace/publish.ts`) no longer emails the printable list. The WhatsApp messages to the seller and the admin stay.
- **Removed code**: `components/marketplace/listings-email-card.tsx`, `lib/marketplace/email.actions.ts`, `lib/marketplace/listings-email.tsx` (the email with QR codes), `lib/marketplace/settings.ts`, the `LISTINGS_EMAIL` setting and its test.
- **Database**: the `MarketplaceSettings` table held only these two settings. The migration `20261029160000_drop_marketplace_settings` drops it.
- **Docs**: `LISTINGS_EMAIL` and the "every new listing emails the list" line are gone from `docs/MARKETPLACE.md`. It was never in `.env.example`.
- **`custom`**: the template never had this feature, nothing to change there.

## Why

Joe doesn't use the printable list by email anymore and wants it gone completely.

## Review (testing stage)

- No leftover references to the removed code, settings or table; the `qrcode` package stays because the WhatsApp QR uses it.
- No new tests: the change only removes code. Lint, type check and all tests pass.

## How to check

1. Run `npx prisma migrate deploy` (drops `MarketplaceSettings`).
2. Open `/admin/listings` as admin: no email card, the buttons sit straight above the filters, no gap. Check at 375 and 320 px too.
3. Publish a listing: it goes live, the seller and admin get their WhatsApp, no list email is sent.
