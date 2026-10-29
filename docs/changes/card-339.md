# Card #339: "Escribir el anuncio con IA" sits at the end of the form

## What changed

- `components/marketplace/description-step.tsx`: the main button of step 2 ("Escribir el anuncio con IA", or "Traducir" with "Mi texto tal cual") is no longer in a `sticky bottom-4` wrapper. It sits after the last field (WhatsApp), and you scroll down to reach it.
- It is a normal large button (`size='lg'`, full width, round), without the `h-14` height and big shadow.
- Unchanged: the spinner while the AI writes, disabled until there is text (own words or no photo), and the three text choices.
- While disabled it now looks faded like every other disabled button. The solid disabled look was only needed while it floated over the form.

## Why

On phones the floating button jumped up when the keyboard opened and covered the text being typed.

## How to test by hand

1. Admin → Anuncios → Nuevo anuncio, add a photo and go to step 2, "Descripción".
2. On a real phone, tap "Cuéntamelo todo" and type: with the keyboard open, no button shows over the field.
3. Scroll down: the button is right after the WhatsApp field. Tap it: the spinner shows and the AI starts writing.
4. Pick "Mi texto tal cual": the button says "Traducir" and stays disabled until there is text.
5. Check at 375px, 320px and on desktop: nothing overlaps or runs off the side.
