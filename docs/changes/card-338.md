# Card #338: Events lead with their day and time; AI pictures get a small sparkle mark

## What changed

- **Events never show "Nuevo".** On `/explore` an event card drops the "Nuevo" badge and the "hace 2 días" age (the town name stays). Its first badge, top left, is its day and time in the visitor's language, with a short weekday so it fits a 320px tile, on one line: "Vie 30/10 · 18:00", or "Hoy · 18:00" on the day. The "new" counts and filters still include events, as before.
- **Event detail page:** the item-condition pill ("Nuevo", "Buen estado", …) only shows on goods. The AI may read a condition from an event's notes, and an event isn't new or old. The same applies to services.
- **AI pictures:** the "Imagen ilustrativa" badge is gone from cards and the detail page. A small round ✨ mark sits bottom right instead: on cards beside the price pill (same pill style), and on the detail photos in the corner, with the shop stamp moved just left of it. Hover shows "Imagen ilustrativa" and screen readers read it, in all 5 languages (`PRODUCT_ILLUSTRATIVE`).
- New component `components/shared/product/ai-picture-mark.tsx`. `formatEventDate` takes an optional weekday style (`'short'`).

## Why

The chef found "Nuevo" on an event, which makes no sense. The "Imagen ilustrativa" text pill was too loud on every AI picture.

## How to test by hand

1. Open `/explore`: an event card starts top left with its day and time, without "Nuevo" or "hace …". A product or wanted ad listed in the last hours still shows "Nuevo".
2. Open an event's page: the date pill shows, and no condition pill shows, even if the listing has one stored.
3. Give a product or event an AI picture (a submission without own photos): its card shows a ✨ mark right of the price, and its page shows the ✨ mark bottom right of the photo, with the stamp beside it. Hover the mark: "Imagen ilustrativa".
4. Check the cards and the detail page of an event, a product and a service at desktop, 375px and 320px, in light and dark: nothing overlaps or is cut off.

Tests: `tests/lib/event-date.test.ts` (short weekday) and `tests/lib/listing-type.test.ts` (an event card's short date badge in Spanish and English).
