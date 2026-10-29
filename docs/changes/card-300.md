# Card #300: AI listing text stays with the seller's words

## What changed

- The AI prompts for items, services and events (`lib/marketplace/ai.ts`) share one writing rule:
  - The title and description are built from what the seller (or admin) wrote: same facts, same tone, only tidied up.
  - The text never describes the photo ("the image shows…", "in the photo you can see…").
  - The text never judges the item or says anything negative about it (wear, scratches, defects). What the seller says about it stays in.
  - When a brand or model is clear, the AI may add one or two short, true, well-known details about it, never sizes, specs or prices that weren't given.
- The item prompt no longer tells the AI to "look at the item" and write about its "visible condition". If the seller wrote nothing, the description just says briefly and neutrally what the item is.
- The `condition` field is still set from the photo and the seller's words, but the texts never mention it.

## Why

Texts said things like "The image only shows an icon…" or pointed out wear the seller never mentioned, which made listings sound like junk.

## How to test by hand

1. `/admin/listings/new`: upload a photo of a used item, write a few words with brand, price and something the seller says ("works great"), choose **Mejorar con IA**.
2. The title and descriptions follow those words in every language, with at most one or two extra details about the model, and say nothing about the photo or wear.
3. Do it again with a photo and no words: the description only names the item, neutrally.
4. Write that something is broken: that stays in the description.
5. The condition field in the editor is still filled in.
