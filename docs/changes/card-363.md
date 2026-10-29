# Card 363: Home step 04, "we don't collect data"

## What changed

- **Step 04 "Small, but from here"** on the home page (`WORKSHOP_STEP_4_TEXT` in `brand/messages/*.json`, all five languages) now says: "We don't collect data, you don't have to sign up or log in, just contact the advertiser."
- The title stays. The template defaults in `resources/*.json` are untouched: this is Baifo's own wording.
- German and French are a little shorter than word for word, so they fit the card's three lines on a 375px phone.

## Why

The chef wanted the step to say plainly that Baifo collects no data and needs no account: you just contact the advertiser.

## Review (testing stage)

- Text-only change, no logic: no new tests. Lint and all tests pass.

## How to check

1. Open the home page and scroll to the four steps. Step 04 shows the new sentence.
2. Switch the language (es, de, fr, it): each shows its translation.
3. At 375px the full sentence fits. At 320px the English text is cut after three lines with "…", like step 03; tapping the card shows the whole text.
