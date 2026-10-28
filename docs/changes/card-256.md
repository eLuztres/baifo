# Card #256: Security checklist re-check (DNS, email, accounts)

## What changed

- `docs/SECURITY-CHECKLIST.md` (already on `main` since 7a04151) was re-checked on 2026-10-29 with read-only lookups.
- Three lines updated: the re-check date, the exact TLS certificate expiry (2027-01-21) and a clearer "check after the next renewal" step.
- No code, no UI, no configuration changed.

## Why

The checklist lists the DNS, email and account steps Joe has to do by hand (DMARC, CAA, DNSSEC, 2FA). The re-check confirms nothing has changed since the first check, so the steps are still valid.

## How to check by hand

1. Read `docs/SECURITY-CHECKLIST.md` and follow the items in order (DMARC first).
2. When done, run the `dig` commands at the bottom of the checklist. Expected after the changes:
   - `dig +short TXT _dmarc.baifo.es` shows `v=DMARC1; p=none; …`
   - `dig +short CAA baifo.es` shows `0 issue "letsencrypt.org"`
3. Certificate: `echo | openssl s_client -connect baifo.es:443 -servername baifo.es 2>/dev/null | openssl x509 -noout -enddate` shows a date after 2027-01-21 once Vercel has renewed it.
