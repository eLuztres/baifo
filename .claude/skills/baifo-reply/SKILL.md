---
name: baifo-reply
description: Write Jose's warm WhatsApp reply to someone who wants to publish on Baifo, and put it on the clipboard ready to paste. Use on /baifo-reply, or for a reply to a person interested in publishing, how it works, what it costs or what to send.
argument-hint: "[name] [what they wrote]"
---

# Baifo reply

Jose answers people on WhatsApp in their own voice. Make that effortless: one question at most, then a message ready to paste.

## Steps

1. **Name.** Take it from the arguments. If there is none, ask in the chat "¿Cómo se llama?" and wait. Ask nothing else.
2. **Write the message.** Start from the `/bienvenida` section in `docs/whatsapp-quick-replies.md` and greet by name: `¡Hola, Sebas! 😊`.
   - If Jose included what the person wrote, answer that first, then give only the information still missing.
   - Reply in the language the person wrote in. Otherwise Spanish, informal `tú`.
3. **Copy it.** Pipe the plain message, with no quote marks or formatting, to `wl-copy`. If it isn't available, use `xclip -selection clipboard`.
4. **Report.** Show the message once in a fenced code block, say it's on the clipboard, and stop. Nothing else is needed.

Each reply is a small chore: no Trello card, no commit, and nothing is sent. Jose does the pasting.

## Voice

Warm and personal, like writing to a friend: short sentences, one or two emoji, ending with a hug. Keep it short enough to read on a phone.

## What's true

- They send a description and up to 8 photos or videos. They don't create anything, Jose does the whole listing.
- A bad photo or background is no problem: Jose can retouch it or remove the background, if they want.
- The listing is translated into 5 languages (Spanish, English, German, French, Italian).
- Jose needs two things: their OK to show their WhatsApp number on the listing, which they can have removed at any time, and 5 € for 1 month online. Right now, as a special launch offer, the same 5 € cover 3 months, counted from the day it's published. Never add urgency to the offer.
- People who see the listing write to them directly. They handle their own agreements.

If they ask something not covered here, such as how to pay or a special case, don't invent it: ask Jose in the chat, and only then copy the message.

## Never

Follow the El Baifo values in `AGENTS.md`. Never promise a sale, push them to publish or renew, ask for data the listing doesn't need, or present AI as doing their thinking. Retouching is always their choice.
