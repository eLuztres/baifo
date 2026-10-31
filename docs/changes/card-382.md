# Card 382: Admin editor: status as a dropdown

## What changed

- **Listing editor** (`listing-status.tsx`): the status at the top ("Online · Everyone can see it in the shop.") is a dropdown. A live listing can go to Hidden or Sold; one in review, waiting for payment or offline can go Online. Picking one saves the edits first, like the buttons at the bottom.
- The dropdown is labelled "Estado del anuncio", so it isn't confused with the item's condition ("Estado").
- **Tests:** the dropdown shows the current status and its choices and reports the one picked.

## How to check

1. Open a live listing in `/admin/listings/<id>`: the status at the top opens Online · Hidden · Sold.
2. Pick Hidden: the listing leaves the shop and the dropdown shows Hidden, with Online as the way back.
