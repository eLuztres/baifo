# Card #326: Admin listing editor compact on phones, no badges on the picture tiles

## What changed

- **Smaller on phones** (below `sm`, desktop unchanged): admin header and its tabs row, "Back to listings", the step bar, the text box (Text label, AI/Original switch, language pills, title), the labelled fields (#327), the selects, date, address and price fields, the WhatsApp and publish buttons.
- **Status box** (`listing-status.tsx`) is one line: icon, status, " · " and the hint, with the save state on the right. At 320 px it may wrap to a second line.
- **Picture tiles** carry no badges any more:
  - No ★ on the tile. The main picture is the first one, bigger and with a coloured frame. The small "Main" label from #322 shows only from tablet width up.
  - "Make main photo" moved into the full-screen viewer, as a button top left. `ImageLightbox` has a new optional `action` prop for it. A video without a still frame can't become main, so the button is hidden for it. A long label (German, Spanish) wraps instead of running into the zoom button.
  - No ✨ badge. Original vs. AI stays as the small switch under the tile.
  - Videos show their still frame (`isStill`) and never play in the tile. They play only in the viewer.
  - What stays on or under a tile: the ✕ to remove a picture (#321, a bit smaller on phones), "Choose still" under a video without one (#323), and the Original/AI switch.
- **"Create picture with AI" tile** is the size of the small tiles, with one icon and the short text `newPictureShort` ("AI picture", in all five languages). The full text stays as its accessible name.

## Why

On a phone the editor was far too big, and the tiles were covered with stars, sparkles and video controls that lay over the neighbouring tiles.

## How to test by hand

1. Open `/admin/listings/<id>` of a listing with several pictures, an AI picture and a video, at 375 and 320 px, light and dark.
2. The status is one small line, and the title and the start of the description are visible without scrolling.
3. The tiles have no star or sparkle; the first one is bigger and framed. The video tile shows a still frame without controls.
4. Tap the second picture: the viewer shows "Make main photo" top left. Tap it: the picture becomes the first tile and the button turns into a disabled "Main".
5. The "AI picture" tile has the size of the other small tiles and opens the prompt field.
6. On desktop the editor looks as before, apart from the badges.
