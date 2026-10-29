# Card 259: contact pop-up with a waving goat, optional nickname, WhatsApp message already written

## What changed

- **Pop-up before WhatsApp** (`components/shared/product/contact-seller-button.tsx`): "Contact" on a listing with a
  seller number opens a dialog with the shop's mascot waving (CSS animation, drawn as a mask in the text color so it
  works in light and dark, still with `prefers-reduced-motion`), one optional field "Your name or nickname" and two round icon buttons side by side: a phone (calls the seller,
  `tel:`) and WhatsApp (opens the chat with the message written). Both have an accessible name and tooltip
  (`CONTACT_SELLER_CALL`, `CONTACT_SELLER_WHATSAPP`). An empty field contacts without a name.
- **Nickname remembered** in `localStorage` (`contact-nickname`) when either button is tapped, and filled in next
  time. Clearing the field and writing forgets it. Enter in the field opens WhatsApp too.
- **Message written for the listing** (`lib/marketplace/contact-texts.ts`, server): in the language the listing was
  created in (the seller's, from their WhatsApp number's country code, as the bot uses; else the shop's language),
  with the listing's name in that language and its link (`SERVER_URL/product/<slug>`). Wording per type:
  `CONTACT_MESSAGE_PRODUCT`, `_WANTED` ("Tengo lo que buscas: …"), `_SERVICE`, `_EVENT`.
- **Nickname cleaned** (`lib/contact-message.ts`): links, `@handles`, domains and odd signs are removed, one line,
  at most 30 characters. Without a nickname the greeting is just "¡Hola!".
- **New setting** `BRAND_CONTACT_IMAGE` (default: `BRAND_LOADER_IMAGE`, else a big 👋), in `.env.example` and the README.
- Texts in all `resources/*.json`. `CONTACT_SELLER_MESSAGE` is gone (only the old button used it).
- **Review (Joe's change request):** the "Skip" link and the "Write on WhatsApp" text button were replaced by the
  phone and WhatsApp icon buttons; `CONTACT_SKIP` was removed and `CONTACT_SELLER_CALL` added. The seller's number
  is no longer shown as text, only behind the phone button.

## Why

Sellers got a bare "I am interested in …" from an unknown number. Now they see who writes and about what, in the
listing's language, while the buyer only has to tap once more (and can skip the name).

## Tests

- `tests/lib/contact-message.test.ts`: nickname cleaning, the message with and without a nickname, every language
  has the placeholders.
- `tests/components/contact-seller-button.test.tsx`: pop-up, call and WhatsApp links, nickname in the
  message and remembered (also when calling), prefilled on the next open, an emptied field writes without a name and
  forgets it, unavailable and rate-limited states.
- `tests/marketplace/contact-texts.test.ts` (review): seller's language from the number, translated listing name
  (fr), fallback to the shop language (language not enabled, no seller), wording per listing type.

## How to test by hand

On a listing with a seller number (`/product/<slug>` of a WhatsApp-published listing):

1. Tap **Contactar**: the pop-up opens with the goat waving and the hand moving; a spinner shows until the number is in.
2. Type "Lula" and tap the **WhatsApp** icon (right): WhatsApp opens with
   "¡Hola! Soy Lula 👋 Te escribo por tu anuncio «…» en Baifo: https://…/product/…".
3. Reload, tap **Contactar** again: "Lula" is filled in. Clear it and tap WhatsApp: the message starts with
   "¡Hola! 👋". Tap the **phone** icon (left): the phone app opens with the seller's number.
   Hovering (desktop) shows "Llamar" / "Escribir por WhatsApp".
4. Type `Lula https://spam.com @insta`: the message says only "Soy Lula".
5. Try a "Busco", a service and an event: the wording fits each.
6. A listing by a seller with a +33 number (and `fr` enabled): the message is in French, with the French name.
7. Light and dark theme; 375px and 320px wide: nothing cut off, the keyboard doesn't hide the button.
8. Keyboard only: Tab reaches the field and both icon buttons (read as "Llamar" and "Escribir por WhatsApp"); Esc closes; a screen reader reads the title
   and the field's label and hint.

## Known limits

- A nickname with a dot between letters (e.g. "Ana.Mar") looks like a domain and is dropped.
- Sellers from countries outside the bot's list get the English text when English is enabled (same rule as the bot).
