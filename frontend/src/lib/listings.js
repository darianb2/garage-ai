// "Find one for sale" — outbound links from the Showroom summary to marketplace
// search results.
//
// DELIBERATELY LINK-ONLY. We hand the shopper off to each marketplace's own
// results page instead of pulling listings into Marble. That is what keeps this
// free of any data licence: building a URL and opening it copies none of their
// content, so there is no API key, contract, rate limit or attribution to
// honour. Pulling listings (price/photo/mileage) INSIDE the app is the thing
// that needs a licence — see notes/listings-licensing.md before going there.
//
// Every URL shape below was verified in a real browser (Chromium, Aug 2026) to
// land on a filtered results page for a launch car. Keyword endpoints were
// preferred over structured filter params wherever both existed, since they
// don't depend on a marketplace's internal make/model ids. Cars.com is the one
// exception — it ignores `keyword=` and only filters via `models[]` — so it
// carries the slug rule below.
import { modelSlugFor } from "./models";

// Production years per generation, keyed by the SAME slug the 3D model registry
// uses (models.js), so a generation has one name across the whole app. `null`
// end = still in production, resolved to the current year at call time. Only the
// configurator cars need an entry: the summary block this feeds only renders
// when configFor() found a configurator.
const GEN_YEARS = {
  "toyota-supra-a80-mk4": [1993, 1998],
  "bmw-m3-e46": [2000, 2006],
  "nissan-gt-r-r35": [2009, 2024],
  "mazda-mx-5-miata-nd": [2016, null],
  "honda-civic-si-9th-gen-fg4": [2012, 2015],
  "honda-civic-si-10th-gen-fc3": [2017, 2020],
  "honda-civic-type-r-fl5": [2023, null],
  "chevrolet-corvette-c8-z06": [2023, null],
};

// The generation's production span. Falls back to the catalog year alone when we
// don't have the generation on file — a one-year search is narrow but honest,
// which beats inventing a range the car was never sold in.
export function yearRange(vehicle) {
  const span = GEN_YEARS[modelSlugFor(vehicle) || ""];
  if (span) return [span[0], span[1] ?? new Date().getFullYear()];
  const y = Number(vehicle?.year);
  return Number.isFinite(y) ? [y, y] : [null, null];
}

// "2017–2020" / "2016–present" / "1997" — the span as the rail shows it.
export function yearsLabel(vehicle) {
  const [from, to] = yearRange(vehicle);
  if (!from) return "";
  const span = GEN_YEARS[modelSlugFor(vehicle) || ""];
  if (span && span[1] === null) return `${from}–present`;
  return from === to ? `${from}` : `${from}–${to}`;
}

// Cars.com model ids are `<make>-<model>` with every run of non-alphanumerics
// collapsed to a single underscore inside the model half ("Civic Si" ->
// "honda-civic_si", "MX-5 Miata" -> "mazda-mx_5_miata"). Verified against
// honda-civic_si; the rest follow the same published pattern. A wrong id
// degrades to Cars.com's unfiltered used-car results rather than an error page.
const makeId = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const carsDotComId = (make, model) =>
  `${makeId(make)}-${(model || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "")}`;

// Marketplaces to offer, ordered for the car in hand. Each entry is
// { id, label, note, url } and opens in a new tab.
export function listingLinks(vehicle) {
  if (!vehicle?.make || !vehicle?.model) return [];
  const [from, to] = yearRange(vehicle);
  const q = encodeURIComponent(`${vehicle.make} ${vehicle.model}`.trim());

  const carsCom = new URLSearchParams({ stock_type: "used", maximum_distance: "all" });
  carsCom.append("makes[]", makeId(vehicle.make));
  carsCom.append("models[]", carsDotComId(vehicle.make, vehicle.model));
  if (from) carsCom.set("year_min", String(from));
  if (to) carsCom.set("year_max", String(to));

  const links = [
    {
      id: "carscom",
      label: "Cars.com",
      note: "dealer inventory",
      url: `https://www.cars.com/shopping/results/?${carsCom}`,
    },
    {
      id: "ebay",
      label: "eBay Motors",
      note: "private + dealer",
      // 6001 is the Cars & Trucks category, so the keyword can't drift into parts.
      url: `https://www.ebay.com/sch/6001/i.html?_nkw=${q}`,
    },
    {
      id: "carsandbids",
      label: "Cars & Bids",
      note: "enthusiast auctions",
      url: `https://carsandbids.com/search?q=${q}`,
    },
    {
      id: "bat",
      label: "Bring a Trailer",
      note: "collector auctions",
      // ?s= resolves to BaT's canonical make/model page when they have one.
      url: `https://bringatrailer.com/?s=${q}`,
    },
  ];

  // Cars still on dealer lots lead with dealer inventory; anything older than a
  // dozen-odd years is auction territory, where Cars.com carries almost nothing.
  const modern = to && to >= new Date().getFullYear() - 12;
  return modern ? links : [...links.slice(1), links[0]];
}
