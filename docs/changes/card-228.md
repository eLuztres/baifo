# Card 228: Listing states per type

## What changed

- **New state `FINISHED` (Terminado)** for events (migration `20261030090000_listing_finished`). The daily cron (`expireListings` in `lib/marketplace/expiry.ts`) takes a live event down the day after its date, on the island's clock, before it looks at expired listings. The person gets no WhatsApp message, and the event can't be relisted (`FINISHED` is not in `RELISTABLE`).
- **Admin:** the Anuncios list has a "Terminado" filter, and the editor shows "Terminado · Ya no se muestra en la tienda" with no relist button. Labels in all 5 languages (`admin-texts.ts`).
- **WhatsApp:** "encontrado" (found, trovato, trouvé, gefunden) takes the newest live listing down like "vendido", with its own reply ("¡Qué bien que lo encontraste!"). The help text mentions it.
- `docs/MARKETPLACE.md`: the status table and seller commands.

The per-type button names and "Encontrado" / "Ya no se ofrece" labels came from #318 on `main`; this card keeps them.

## Why

The chef decided on 28–29 October: only Online listings are in the shop, Expired stays one state, Busco is "found" rather than "sold", and a past event finishes by itself instead of staying online until its 3 months run out. No Paused state.

## How to check

1. Make a live test event with a date in the past (yesterday), then run the daily cron (`/api/cron/marketplace` with the cron secret). The event leaves the shop, its status is Terminado, and no WhatsApp goes out.
2. An event dated today stays online until tomorrow.
3. In Admin → Anuncios, open the "Terminado" filter: the event is there. In its editor there is no "Volver a publicar".
4. On WhatsApp, with a live listing, write "encontrado": the listing goes down and the reply says "¡Qué bien que lo encontraste!". Write "ayuda": the help mentions "encontrado".

## Review

- No bugs found. `tsc` failed at first only because the Prisma client in the worktree was stale; `prisma generate` fixed it.
- Tests from the build cover the cron (yesterday's event finishes, today's stays, no message), the "encontrado" command and its reply.
