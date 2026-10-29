# Card #278: Remove "Through the Corral" for now

## What changed

- **New listing (admin), description step:** the "How do people reach it?" choice (the person's WhatsApp or "Through the Corral") is gone. The WhatsApp field stays where it was and is always required. Without a number the admin sees "Enter their WhatsApp: buyers write to them directly.", and `describeAdminListing` refuses it on the server too.
- **Publish page (`/publicar/<token>`):** the "Extras · Communication goes through us (coming soon)" checkbox is removed.
- **Listing page:** older listings without a seller number used to send buyers to the place's Corral WhatsApp. They now go to the shop's own WhatsApp (`BRAND.contact.whatsappUrl`), with the listing's name and link in the message.
- **Texts:** the Corral contact wording is removed from the admin texts in all 5 languages, including the phone hints in the new-listing step and the listing editor.
- **Docs:** the WhatsApp quick replies (`docs/whatsapp-quick-replies.md`) no longer ask "your number, or contact through El Corral (extra)?". They now say the number will show next to the listing. `docs/MARKETPLACE.md` no longer mentions the extras on the publish page.

## Why

Baifo only connects people directly for now. Contact through the Corral is parked as #131, to be decided with Chantal after launch.

## Kept for #131

No data is deleted. Listings without a number keep working through the house seller, and the editor still lets the admin clear a number. The Corral places, Corral pages and "pay at El Corral" stay, because they aren't about who buyers contact.

## How to test by hand

1. As admin, start a new listing and go to the description step. There is no "How do people reach it?" choice. Leave the WhatsApp empty and send: the error asks for their WhatsApp. Enter a number: the text is written.
2. Open a `/publicar/<token>` link: no "Extras" section between the plans and the consent.
3. Open a listing that has no seller number: "Contact" opens the shop's WhatsApp with the listing's name and link.
4. Check the three pages at 375px and 320px width: nothing overlaps or is cut off.
