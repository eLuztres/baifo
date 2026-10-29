# Card #224: Listing flow polish

Built in commit 4d2798b ("Listing payment claims, coming-soon extras, seller number edit"). This card's branch adds only this note.

## What changed

- **New listing, photos:** the "¿Otra foto?" pop-up also has "Continuar con las fotos tal cual". It goes to the description step while the uploads keep running.
- **Seller's WhatsApp:** the admin can change it in the listing editor under "Más opciones", but only before the listing goes live (`IN_REVIEW` or `AWAITING_PAYMENT`). A new number means a new seller, and the old number's consent is cleared.
- **Consent:** the "the seller agrees…" tick is gone from the admin description step. Consent comes only from the person on `/publicar` (or a WhatsApp "SÍ").
- **`/publicar`:** "Grande" is now "Premium", shown greyed out with "Próximamente". The server refuses any plan other than `normal` and any extras. "Confirmar mi anuncio" stays disabled until the consent box is ticked.
- **Checkout:** progress line, Bizum or cash at El Corral as cards, "Ya he hecho el Bizum" / "Pasaré por El Corral" saves `payClaimedAt` / `payClaimedMethod` (migration `20261028180000_pay_claimed`), and the admin sees "La persona dice que ha pagado…" before pressing Pagado.
- **Corral extra (point 5):** not shown. Commit 0a32a74 removed "La comunicación pasa por nosotros" on purpose (buyers write to the person directly).
- **Bizum (point 7):** shows up once `BIZUM_PHONE` is set on Vercel.

## Why

Jose tried the flow on 2026-10-28: the admin had to wait for uploads, couldn't fix a typo in the number, and the admin gave consent on the person's behalf.

## How to test by hand

1. `/admin/listings/new`: add a photo, choose "Continuar con las fotos tal cual" while it is still uploading. The description step opens and has no consent tick.
2. Open the listing in the editor, "Más opciones": change the WhatsApp number and save. The consent shown for the listing is reset. On a live listing the change is refused.
3. Open the listing's `/publicar/<token>` link: Premium is greyed out with "Próximamente", and "Confirmar mi anuncio" only works after ticking the box.
4. Choose Bizum (with `BIZUM_PHONE` set) or cash, press the claim button: the closing screen stays after a reload, and the admin listing shows "La persona dice que ha pagado…".
5. Check `/publicar` at 375px and 320px: the payment cards stack and nothing runs off the side.

Tests: `tests/marketplace/checkout.test.ts` (plan/extras refused, payment claim) and `tests/marketplace/listing-edit.test.ts` (number change and consent reset).
