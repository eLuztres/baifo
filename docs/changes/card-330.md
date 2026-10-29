# Card #330: Showcase preview app (password, noindex, copy script)

## What changed

- New setting `PREVIEW_PASSWORD`. When it's set, every page asks for that shared password in the browser's login box (any user name works). A wrong, missing or garbled login gets "Password required", never an error page.
- With the same setting the site stays out of search engines: an `X-Robots-Tag: noindex` header on every response (pictures too), a noindex meta tag and a robots.txt that disallows everything. baifo.es doesn't set it, so nothing changes there.
- `npm run showcase-copy -- --to "<preview DB URL>"` copies the 46 `vitrina-` listings, their categories and places from the local database into a preview database. Without `--apply` it only counts; `--remove` deletes the listings again. It refuses a target that has any listing not starting with `vitrina-`, so it can't write to production.
- `docs/PREVIEW.md` lists the clicks for the second Vercel project (`baifo-showcase`) with its own Neon database.

## Why

The showcase (#324) only exists locally. It should be visible on the iPhone at a second address without touching baifo.es, its database, payments, WhatsApp or emails. The existing `baifo` project shares the database and WhatsApp secrets between production and previews, so a second project is the safe route.

## How to test by hand

1. Put `PREVIEW_PASSWORD=test` in `.env` and start the dev server. Open `http://localhost:3000`: the browser asks for a login. Cancel: "Password required". Any user name with `test`: the shop loads.
2. `curl -I -u x:test http://localhost:3000/` shows `X-Robots-Tag: noindex, nofollow`; `/robots.txt` says `Disallow: /`.
3. Remove `PREVIEW_PASSWORD`, restart: no login, no noindex header, the normal robots.txt.
4. Create an empty local database, migrate it, then `npm run showcase-copy -- --to "<its URL>"` (counts only), add `--apply` (copies), run it again (no duplicates), and `--remove` (deletes the listings).
5. Point `--to` at a database with real listings: it stops without writing.
