# Card #258: seller name or nickname and language on every listing

## What changed

- Sellers can set a **name or nickname** and the **language buyers write to them in**, on their private `/publicar/<token>` link ("Who offers it" box) and in the admin listing editor under "Más opciones". Both are optional and can be changed any time, also after the listing is live.
- The listing page shows **"Offered by <name>"** above the Contact button. After a click on Contact, the WhatsApp message is already written in the seller's language.
- Empty name: the seller's WhatsApp profile name. Empty language: the language of their phone number's country. Listings without a seller number (made by Baifo itself) show no name unless the admin types one.
- The server checks the name with Zod (`sellerNameSchema`): trimmed, at most 30 characters, no links, emails or phone numbers. The language must be one of the shop's languages (`sellerLocaleSchema`).
- Two new optional columns on `Submission`: `sellerName`, `sellerLocale` (migration `20261029140000_listing_seller_name`).

## Why

Buyers should know who they are writing to, without anyone having to give a real name. Writing to the seller in their own language makes the first message easier for visitors from abroad.

## How to test by hand

1. Run `npx prisma migrate deploy` (or `migrate dev`) and start the dev server.
2. Open a seller's `/publicar/<token>` link (a listing waiting for payment or live, with a seller number). The "Who offers it" box shows the WhatsApp name as placeholder.
3. Type "Lula", choose Deutsch, save: the button says it was saved. Try "Lula 612345678" or "lula.es": an error shows and nothing is saved.
4. Open the live listing: "Offered by Lula" is above Contact. Click Contact, then WhatsApp: the message is in German.
5. Clear the name and save: the listing shows the WhatsApp profile name again.
6. In `/admin/listings/<id>` → "Más opciones": change the name and language and save; the listing page follows.
7. Check the seller page, the listing page and the editor at 375px and 320px: nothing overlaps or is cut off.
