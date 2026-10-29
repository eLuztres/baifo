# Card #47: QR codes on the printed listings email

## What changed

- Every row of the listings email (`lib/marketplace/listings-email.tsx`) has a QR code on the right. Scanning it opens that listing's page (`/product/<slug>`). The printed link stays.
- The codes are PNGs made with the `qrcode` package (already installed), dark on white, and sent as inline attachments. The email shows them as `cid:qr-<slug>` images.
- The printed link may now wrap anywhere. Without that, the long link plus the QR column made the email wider than a 375px phone screen.
- `EmailAttachment` (`email/email-service.ts`) now also takes `contentType` and `inlineContentId`, which Resend uses for inline images.
- Tests: the email service passes inline attachments to Resend, and the listings email attaches one QR per listing and refers to each by its `cid`.

## Why

The list is printed and pinned up, so people need a way to open a listing from paper. Gmail blocks `data:` images, so the codes are real attached images. Nothing is uploaded, so there is nothing to clean up later.

## How to test by hand

1. Set the listings email address in `/admin/listings` to a Gmail account and press **Enviar lista**.
2. In Gmail on desktop and on a phone, every row shows its QR code next to the text, nothing overlaps and the email doesn't scroll sideways. On a very small 320px screen it is a few pixels too wide (it was wider before this change).
3. Scan a code with a phone camera, from the screen and from a printout. The right listing page opens.
4. Some email apps also list the QR images as attachments. That is expected.
