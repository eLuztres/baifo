# Security checklist: baifo.es

Checked on 2026-10-28 with read-only lookups (`dig`, `openssl`, `curl`). Nothing was changed.
DNS is at **GoDaddy** (`ns61/ns62.domaincontrol.com`). Website on **Vercel**, incoming mail through **ImprovMX**, outgoing mail through **Resend**.

| # | Item | Priority | Status today |
| :- | :--- | :--- | :--- |
| 1 | DMARC record | **HIGH** | missing |
| 2 | 2FA on every account | MEDIUM | check each one |
| 3 | `send.baifo.es` record | LOW | OK. It belongs to Resend, so keep it |
| 4 | CAA record | LOW | missing |
| 5 | DNSSEC, domain lock, renewal | LOW | DNSSEC is off. Check the rest in GoDaddy |

**Adding a record in GoDaddy:** sign in → **My Products → Domains → baifo.es → DNS → Add New Record**. For **Name**, type only the part before `baifo.es` (`_dmarc`, not `_dmarc.baifo.es`), and use `@` for the domain itself. Set **TTL** to **1 Hour**.

---

## Current records (for reference)

```
baifo.es              A      216.198.79.1                       (Vercel)
www.baifo.es          CNAME  cname.vercel-dns.com.              (Vercel)
baifo.es              MX     10 mx1.improvmx.com. / 20 mx2.improvmx.com.
baifo.es              TXT    "v=spf1 include:spf.improvmx.com ~all"
baifo.es              TXT    facebook-domain-verification=…, google-site-verification=…
resend._domainkey     TXT    "p=MIGfMA0…"                       (Resend DKIM key)
send.baifo.es         CNAME  send.forge.rmta.net.               (Resend, see item 3)
  └ resolves to MX 10 feedback.forge.rmta.net. and
    TXT "v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all"
_dmarc.baifo.es       (none)
CAA                   (none)
DS / DNSKEY           (none, so no DNSSEC)
TLS certificate       Let's Encrypt (YR1/YR2), auto-renewed by Vercel
```

---

## 1. DMARC (HIGH)

**Why:** without DMARC, mail servers have no rule for mail that only pretends to come from @baifo.es, so a fake "pay your listing fee" mail can reach sellers' inboxes.

**Who really sends as @baifo.es** (all of these must keep passing):

- **Resend**, for the site's emails (`SENDER_EMAIL` is an @baifo.es address). It signs with the `resend._domainkey` DKIM key and bounces through `send.baifo.es`, so DKIM and SPF both line up with baifo.es and pass DMARC. ✅
- **ImprovMX**, only if you *reply as* @baifo.es through ImprovMX's SMTP (for example Gmail's "Send mail as"). That is why `include:spf.improvmx.com` is in the SPF record. Keep it.
- Stripe, PayPal, Google, Meta and WhatsApp send from their own domains. They don't count.
- If you reply as @baifo.es from Gmail **without** ImprovMX SMTP, those replies will fail DMARC. Before step "Later 2", set up "Send mail as" with ImprovMX SMTP or reply from the Gmail address instead.

### Step 1: get a place for the reports (free)

Pick **one** of these:

- **Postmark DMARC (recommended, free):** <https://dmarc.postmarkapp.com> → enter `baifo.es` and your email. You get your own address like `re+xxxx@dmarc.postmarkapp.com` and a readable summary every week.
- **Resend's DMARC analyzer:** see <https://resend.com/docs/dashboard/domains/dmarc>.
- **Your own address:** add an alias `dmarc@baifo.es` in ImprovMX. Reports then arrive as zipped XML files, which are harder to read.

### Step 2: add the record in GoDaddy

| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:REPORT_ADDRESS; adkim=r; aspf=r; pct=100` | 1 Hour |

Replace `REPORT_ADDRESS` with the address from step 1. Add only **one** `_dmarc` record.

### Verify

```shell
dig +short TXT _dmarc.baifo.es
# expected: "v=DMARC1; p=none; rua=mailto:…"
```

Then send a test email from the site (for example a password reset). In Gmail, open it → **⋮ → Show original**. It should show `SPF: PASS`, `DKIM: PASS` and `DMARC: PASS`.

### Later: tighten step by step

| When | Change the `_dmarc` value to |
| :--- | :--- |
| Now | `v=DMARC1; p=none; rua=mailto:REPORT_ADDRESS` |
| After about 2–4 weeks, if the reports show only Resend (and ImprovMX) passing | `v=DMARC1; p=quarantine; pct=100; rua=mailto:REPORT_ADDRESS` |
| After about 4 more weeks with no real mail failing | `v=DMARC1; p=reject; rua=mailto:REPORT_ADDRESS` |
| Together with `p=reject` (optional) | Change the SPF on `@` from `~all` to `-all`: `v=spf1 include:spf.improvmx.com -all` |

If a report shows a sender that is yours but fails, fix that sender before you tighten the policy.

---

## 2. Two-factor login (2FA) on every account (MEDIUM)

**Why:** whoever gets into one of these accounts can take over the domain, the site, the payments or the mail. A stolen password alone should not be enough.

Use an authenticator app (Google Authenticator, Authy, 1Password …) or a passkey rather than SMS where you can, and **save the backup codes** in a password manager. If you log in to a service *with* GitHub or Google, that service is only as safe as the GitHub or Google account.

| Account | Where to turn it on | Help |
| :--- | :--- | :--- |
| **GoDaddy** (most important: it controls the domain) | Account (top right) → **Account Settings → Login & PIN → 2-Step Verification → Add** | godaddy.com/help, search "2-step verification" |
| **Google** (Search Console, Google login, maybe Gmail) | myaccount.google.com → **Security → 2-Step Verification** | <https://support.google.com/accounts/answer/185839> |
| **GitHub** (the code, and often your login for Vercel, Neon and UploadThing) | **Settings → Password and authentication → Enable two-factor authentication** | <https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication> |
| **Vercel** | **Account Settings → Authentication → Two-Factor Authentication** | <https://vercel.com/docs/two-factor-authentication> |
| **Neon** (database) | If you log in with GitHub or Google, 2FA there covers it. Otherwise use **Account settings**. | <https://neon.com/docs/manage/accounts> |
| **Stripe** | **Settings → Personal details → Two-step authentication** | <https://support.stripe.com/questions/enable-two-step-authentication> |
| **PayPal** | **Settings (⚙) → Security → 2-step verification → Set up** | <https://www.paypal.com/us/cshelp/article/what-is-2-step-verification-and-how-do-i-turn-it-on-help342> |
| **UploadThing** | You log in with GitHub, so GitHub's 2FA covers it | <https://docs.uploadthing.com> |
| **Resend** | Log in with GitHub or Google (covered by them). Otherwise turn on 2FA in the account settings if offered. | <https://resend.com/docs/dashboard/settings/team> |
| **ImprovMX** | **Account → Security → Two-factor authentication** | <https://improvmx.com/guides/enabling-disabling-password-2fa/> |
| **Meta** (Facebook / WhatsApp Business) | Facebook: **Settings → Accounts Center → Password and security → Two-factor authentication**. In Business Settings → **Security Center**, also require 2FA for everyone in the business. | <https://www.facebook.com/help/148233965247823> |

**Verify:** log out of each account and back in. It must ask for the second factor.

**Later:** once a year, check each account's list of members and API keys, and remove anything that isn't used anymore.

---

## 3. `send.baifo.es` (LOW): this record is expected

**Finding:** `send.baifo.es` is a CNAME to `send.forge.rmta.net`. **rmta.net is Resend's own mail domain.** <https://rmta.net> says so ("the apex domain used by Resend's mail servers for email authentication and bounce handling"), and the SPF IPs reverse-resolve to `mta1/mta2.forge.rmta.net` and `s1.b0.rmta.net`. This is Resend's newer setup: one CNAME instead of the older `MX send → feedback-smtp.<region>.amazonses.com` + `TXT send → v=spf1 include:amazonses.com ~all`. It is the bounce/return-path address, so SPF lines up with baifo.es. **Don't delete it.**

**Why it still needs a check:** a record pointing at a service you don't control any more (a "dangling" record) could be taken over by someone else.

**Check in Resend:** <https://resend.com/domains> → **baifo.es**.

- [ ] Status is **Verified**.
- [ ] The **DKIM** record listed (`resend._domainkey`) has the same `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVIQnq…` value as DNS.
- [ ] The **SPF / return-path** record listed is `send` → `send.forge.rmta.net` (or Resend's MX/TXT pair for `send`, which resolve to the same values).
- [ ] This is the only Resend account/team that has baifo.es.

If baifo.es is **not** in your Resend account, or the records shown don't match DNS, delete the `send` CNAME in GoDaddy and add the domain again from your own account.

**Verify:**

```shell
dig +short CNAME send.baifo.es        # send.forge.rmta.net.
dig +short TXT resend._domainkey.baifo.es
```

---

## 4. CAA record (LOW)

**Why:** a CAA record says which certificate authorities may issue HTTPS certificates for baifo.es, so no other CA can issue one by mistake or because someone tricked it.

The certificate today is **Let's Encrypt**. Vercel documents that it uses Let's Encrypt and that a CAA record must allow it: `0 issue "letsencrypt.org"` (<https://vercel.com/docs/domains/troubleshooting#missing-caa-records>). `www` is a CNAME to Vercel, so Vercel's own CAA (Let's Encrypt, Sectigo, GlobalSign, Google) applies there. The record below covers `baifo.es` itself and any future subdomain with an A record.

| Type | Name | Flags | Tag | Value | TTL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| CAA | `@` | 0 | issue | `letsencrypt.org` | 1 Hour |
| CAA *(optional)* | `@` | 0 | iodef | `mailto:REPORT_ADDRESS` | 1 Hour |

If you ever add a service that needs certificates from another CA on baifo.es itself, add an `issue` line for that CA first.

**Verify:**

```shell
dig +short CAA baifo.es                       # 0 issue "letsencrypt.org"
echo | openssl s_client -connect baifo.es:443 -servername baifo.es 2>/dev/null | openssl x509 -noout -issuer
# issuer=… O=Let's Encrypt …
```

**Later:** in about 3 months (after the next renewal around Jan 2027), check that the site still loads over HTTPS and that **Vercel → Settings → Domains** shows no certificate error.

---

## 5. DNSSEC, domain lock and renewal (LOW)

**Why:** DNSSEC stops forged DNS answers, and the lock and auto-renew stop the domain from being transferred away or expiring. The public `.es` whois doesn't show the expiry date or lock status, so check them in GoDaddy.

In GoDaddy: **My Products → Domains → baifo.es**

- [ ] **Auto-renew: On**, and the payment card on file is valid.
- [ ] **Expiration date** noted in your calendar (with a reminder one month before).
- [ ] **Domain lock / Domain Protection** turned on, if offered for `.es`.
- [ ] Registrant contact email is one you read. Recovery mails for the domain go there.
- [ ] **DNSSEC** (under **DNS → DNSSEC**): turn it on if GoDaddy offers it for this domain without extra cost. If it needs a paid plan (Premium DNS), it's fine to skip it. 1–4 matter more.

**Verify DNSSEC** (once turned on):

```shell
dig +short DS baifo.es       # should show a line like "12345 13 2 ABCD…"
```

---

## Quick re-check (all items)

```shell
dig +short TXT _dmarc.baifo.es
dig +short TXT baifo.es
dig +short CAA baifo.es
dig +short DS baifo.es
dig +short CNAME send.baifo.es
dig +short TXT resend._domainkey.baifo.es
```
