# Card 367: Contacto: phone from the description prefills WhatsApp

## What changed

- **Builds on #361** (Fotos → Descripción → Contacto), which wasn't in `main` yet: its branch is merged into this one. The only conflict was in `listing-workspace.tsx`, where #364's type tabs and #361's step bar both stay.
- **Finding the number** (`lib/marketplace/phone-in-text.ts`): `findPhoneInText` returns the first Spanish number in a text exactly as it was written. It accepts 6/7/8/9 plus eight more digits, with or without +34/0034, and with spaces, dots or dashes between the digits. Prices ("180 euros", "950.000 €"), times ("20:00") and dates ("6.10.2026 20:00") don't count.
- **Contacto step** (`description-step.tsx`): on "Siguiente", an empty WhatsApp field gets that number. A number the admin already typed is never replaced, and the field can still be changed or cleared. This works for every type.
- **Review fix** (`admin.actions.ts`): a number written with 0034 ("0034 612 345 678") was saved as WhatsApp `0034612345678`, which isn't a valid WhatsApp id. The leading 00 is now dropped, so it's saved as `34612345678`, the same as +34. The prefill made this case more likely.

## How to check

1. New listing → Evento → "Sin foto". Write "… Info: 628 111 222" → Siguiente: the WhatsApp field shows 628 111 222.
2. Change the number, go back to Descripción, then Siguiente again: your number stays.
3. A description without a number ("Bici, 180 euros"): the field stays empty.
4. A description with "WhatsApp 0034 612 345 678" → Siguiente → Crear: the listing's seller is +34 612 345 678.
