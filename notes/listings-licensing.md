# "Find one for sale" — what needs a licence and what doesn't

Written 2026-08-24, when the Showroom summary CTA went from an inert button to
real outbound marketplace links. Read this before anyone tries to show listing
data *inside* Marble — that's where the line is.

## The line

**Linking out is free. Pulling listings in is licensed.**

Building a search URL and opening it in a new tab copies none of a marketplace's
content. There is no API key, no contract, no rate limit, no attribution
requirement, and no agreement to accept. That is what `lib/listings.js` does, and
it's why it needed no legal work.

The moment we render *their data* — price, mileage, photo, dealer, VIN — inside
Marble, we're redistributing their content and we need a licence.

## What we ship today (Tier 1 — no licence)

Four destinations in `frontend/src/lib/listings.js`, each verified in a real
browser (Chromium, Aug 2026) to land on a filtered results page:

| Site | Endpoint | Notes |
|---|---|---|
| Cars.com | `/shopping/results/?makes[]=&models[]=&year_min=&year_max=` | Only structured one. **Ignores `keyword=`** (verified — it returns all vehicles), so it needs the `<make>-<model_snake>` id, e.g. `honda-civic_si`. |
| eBay Motors | `/sch/6001/i.html?_nkw=` | `6001` = Cars & Trucks, so the keyword can't drift into parts. |
| Cars & Bids | `/search?q=` | `/search/<query>` redirects here. |
| Bring a Trailer | `/?s=` | Redirects to the canonical make/model page when they have one. |

Keyword endpoints were preferred over structured filters wherever both existed —
they don't depend on a marketplace's internal make/model ids, so they don't rot.

Dropped after testing: **Autotrader** (every path returned "page unavailable" to
non-residential traffic — couldn't verify, so didn't ship a guess) and
**Hemmings** (Cloudflare bot wall on `/search`; the `/classifieds` path ignores
`q`). **CarGurus** `/Cars/search?q=` 404s; its real listing URLs need internal
entity ids.

Note: Cars.com rate-limited us with a Cloudflare 403 after ~8 rapid requests
while probing. Don't batch-verify their URLs; space it out or check by hand.

### Trademark

Naming them in text ("Cars.com", "eBay Motors") is nominative fair use — we're
truthfully identifying where the link goes. **Do not** use their logos or
wordmark images; those are covered by brand/partner guidelines, not fair use.

## What Tier 2 would cost (inline listings — licensed)

If we ever want listing cards rendered in the Showroom:

- **eBay Browse API** — free developer account, but the API License Agreement has
  two terms that directly constrain Marble's design: eBay content in a public
  display **may not be co-mingled with non-eBay content**, so we could not blend
  eBay results into a merged feed with other sources or overlay them on the 3D
  stage as one list — they need visual isolation. And when a listing is no longer
  publicly available on eBay we must **delete it** from our app, so no caching a
  stale results set.
- **Marketcheck** — commercial, paid, contract. Aggregated US dealer inventory
  (5B+ listings since 2015). This is the realistic route to "real prices for this
  generation" if we want it. Auto.dev is a similar, smaller alternative.
- **Scraping** Autotrader / Cars.com / CarGurus / Craigslist — against their ToS,
  and listing photos are copyrighted by the dealer or photographer. Not a path.
- **BaT / Cars & Bids** — no public API. Links only.

## Monetization (optional, not wired)

CarGurus and Auto Trader run affiliate programs through networks like FlexOffers
and Admitad — CarGurus pays a flat ~$4.80 per qualified lead on a 30-day cookie.
Taking that means signing up, tagging the URLs, and adding an FTC affiliate
disclosure to the page. Deliberately **not** done: today's links are neutral and
unmonetized, which is also why they need no disclosure. CarGurus additionally
prohibits PPC brand bidding — irrelevant to an in-app link, relevant if we ever
advertise.

## The honest limitation

A configured build (paint, splitter, cage) has no counterpart in a listings
search. We can only filter by generation year range + make/model. The rail copy
says so outright — "listings aren't filtered by the paint and mods above" —
rather than the old CTA's "Exact matches first", which promised matching we
cannot do.
