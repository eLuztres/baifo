# Card 364: New listing: type tabs stay on every step

## What changed

- **One tab row for the type** (`components/marketplace/listing-type-tabs.tsx`): Producto · Busco · Servicio · Evento with the step-1 look and the "i" popup on the chosen type. Links before the listing exists, buttons after.
- **Step 2 and "back on photos"** (`listing-workspace.tsx`): the tabs sit above the steps. A switch keeps the written text, WhatsApp and text mode. Only the AI prompt, hints and photo buttons follow the type. Locked while the AI writes the listing.
- **The written listing** (`listing-editor.tsx`): the #350 switch uses the same tabs, above the steps. Its logic and saving are unchanged. On the edit page the tabs now sit above the status line.
- **Saving the type** (`updateAdminListingPhotos`): takes an optional `type`. With the same photos and AI choice, only the type is saved and no second picture run starts.
- **Evento:** with photos and AI pictures, switching to Evento uses the photos as they are. Switching away turns the AI pictures back on, and the ones already made come back. Without a photo nothing changes: the AI still makes the event's picture from the description.

## How to check

1. New listing → "No photo: the AI makes it". On Description, switch types: the prompt's example text changes, and what you typed stays.
2. Go back to Photos and switch there too. The tabs stay in the same place.
3. Open a written listing (`?anuncio=` in review). The tabs sit above the steps, and switching shows the event, service or product fields.
4. Check at 375 px and 320 px: one row, nothing cut off.
