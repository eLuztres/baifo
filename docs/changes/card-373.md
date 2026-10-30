# Card 373: Listing: see and edit the phone number

## What changed

- **Private listing page** (`/publicar/<token>`, `seller-phone-form.tsx`): a new "Tu WhatsApp" card shows the last three digits of the number buyers write to, while the listing waits for payment and while it is live. Baifo's own listings (no number) don't show it.
- **Cambiar número** (`changeSellerPhone` in `checkout.actions.ts`): the person types the current number and the new one. A 9-digit number gets +34, and 00 counts as +. The listing and its product move to the seller with the new number (created if new, keeping the old WhatsApp name), and the product's `contactPhone` follows when the person gave their OK. WhatsApp contact, reminders and **Marcar como vendido** then use the new number.
- **Why the current number:** anyone with the forwarded link can open the page. Showing the full number or changing it without the old one would let them take the listing over. Wrong tries share the close-listing limits (5 per hour per link).
- **Shared phone check:** `sellerPhoneSchema` moved to `lib/validators.ts` and `toWaId` to `lib/marketplace/seller.ts`, so the admin Contacto step and this form read numbers the same way.
- **Layout fix:** on phones the cards on this page ran off the right edge (`grid-cols-1` added).
- **Tests:** the number change (live, unpaid, 00 prefix, no consent, wrong or invalid number, house listing, limits) and `sellerPhoneSchema`.

## How to check

1. Open a person's listing via its private link: the "Tu WhatsApp" card shows "··· 678" (the last digits).
2. Cambiar número → a wrong current number: "wrong number" error. Nothing changes.
3. The right current number and a new one (e.g. `0034 699 111 222`) → the card says it now ends in 222.
4. On the public product page, the WhatsApp button opens the new number. **Marcar como vendido** accepts the new number, not the old one.
5. At 375px and 320px the card and its buttons fit without running off the side.
