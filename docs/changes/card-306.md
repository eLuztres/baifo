# Card #306: Review of the listing editor for every type

## What changed

No code changed. This card is a review of `/admin/listings/<id>` (`components/marketplace/listing-editor.tsx`) for products, services, wanted and events. Each problem it found became its own small Backlog ticket:

| Ticket | Problem |
|---|---|
| #314 | A listing made without AI shows the AI badge on its cover (`isAiPicture` falls back to "first picture" when there are no AI images) |
| #315 | "Mark as sold" acts on one click, with no confirm |
| #316 | "Sold" is the wrong word for services and events |
| #317 | Delete for good is only on the listings list, not in the editor |
| #318 | No hide / show again, no relist after sold, no cancel for events (needs the chef's choice) |
| #319 | Wanted: "From" is required, so "up to 60 €" shows as "Budget 60,00 €" |
| #320 | Wanted: a "To" below "From" is dropped without a word |
| #321 | Removing a picture is hidden under "More options" |
| #322 | Pictures can't be reordered, only the main one picked |
| #323 | The video still can't be chosen, and nothing says why a video can't be the cover |

Works as expected: texts in every language with the three AI modes, saving the typed text, adding pictures and AI pictures, category, place, seller name and language, prices and condition per type, event date, time, entry price and address, publish and renew.

## Why

To get a list of small fixes for the editor instead of one big rework.

## How to test by hand

There is nothing to test in this card. The review was done by reading the code plus the visitor pages, not in the editor itself (no admin login for the agent), so a hands-on pass is still owed:

1. Sign in as admin and open the four `QA306 …` test listings (one per type, in review, test seller 34600306306).
2. Go through each ticket above and confirm the problem shows up.
3. Delete the `QA306` listings afterwards.
