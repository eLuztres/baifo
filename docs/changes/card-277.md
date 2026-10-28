# Card #277: "Only fix mistakes" text choice

## What changed

- "¿Cómo quieres el texto?" on a new admin listing has a third choice between "Mejorar con IA" and "Mi texto tal cual":
  **Solo corregir errores**. The AI fixes only spelling, grammar and punctuation, keeps the admin's words, style and
  order, then translates into the other shop languages.
- Like "Mi texto tal cual", it shows the optional title field and needs a text before sending.
- The listing editor's switch is now **IA · Corregido · Original**. The first time "Corregido" is picked, one AI call
  corrects and translates the text; after that the saved version comes back at once.
- Labels, hints and the "AI is fixing" message are in es, en, it, fr and de. The three choice cards stack on phones.
- The category editor keeps its two choices.

## Why

Admins often want their own wording but without typos. "Mejorar con IA" rewrote too much, "Mi texto tal cual" kept the
mistakes.

## Under the hood

- `TEXT_MODES` gains `corrected` (`Submission.textMode` is a string column, so no migration).
- `processing.ts` passes `kept.isCorrected` to `writeListing`; the AI's corrected shop-language text is then kept
  instead of being replaced by the raw words.
- `chooseListingText(id, 'corrected')` calls the new `correctText` (correct + translate in one step) when no corrected
  version exists yet.

## How to test by hand

1. Admin → new listing, add a photo, write a text with typos (e.g. "bici comoda en buen estao, 80€").
2. Pick **Solo corregir errores**: the title field shows, the line below says the AI only fixes spelling and grammar,
   the button stays off until there is text.
3. Send. In the editor, the Spanish text has the same words with the typos fixed; other languages are translations.
4. Switch to **Original**, then **IA**, then back to **Corregido**: the corrected text comes back at once.
5. On an older listing, pick **Corregido** for the first time: "La IA corrige el texto…" shows, then the corrected text.
6. Check at 375px and 320px: the three cards stack, the editor switch fits on one line.
7. Without signing in: `npm run storybook` → Marketplace/TextModeSwitch shows the cards, the editor pills and the
   category editor's two choices.
