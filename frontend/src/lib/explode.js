// Explode-mode data (design ref #4a Explode). Each serviceable part carries a
// replace-by interval, a plain-language note, grounding badges, and a compared
// source list (Cheapest / Best rated / Trusted-OEM). Prices/vendors are
// ILLUSTRATIVE placeholders — wire to a real /api/parts index later; Marble links
// out, it doesn't sell.
//
// One base template drives every car; the engine/transmission detail lines fill
// from the car's curated specs, and a per-car OVERRIDES map adds real OEM numbers
// + hand-picked sources for showcase cars (the Supra matches the mock exactly).

// Illustrative source rows derived from a base price: aftermarket / best-rated /
// trusted-OEM, so any part gets a plausible comparison without hand-authoring.
function sources(base, { aftermarket = "PartsHub · aftermarket", best = "TrustedBrand", oem = "OEM direct" } = {}) {
  const r = (n) => Math.max(4, Math.round(n));
  return {
    cheapest: { tier: "CHEAPEST", price: r(base * 0.75), vendor: aftermarket, rating: "4.2★ · 1.4k" },
    bestRated: { tier: "BEST RATED", price: r(base * 1.05), vendor: best, rating: "4.8★ · 620" },
    trusted: { tier: "TRUSTED · EXACT", price: r(base * 1.6), vendor: oem, rating: "exact match" },
  };
}

// Base serviceable parts, shared across cars. glyph maps to a simple mark in the UI.
const BASE = {
  engine: { name: "Engine", replaceMi: "inspect only", group: "Engine", glyph: "engine",
    note: "Inspect for leaks and check compression on any older performance engine.", badges: ["CURATED"], base: 0 },
  oilfilter: { name: "Oil filter", replaceMi: "5k mi", group: "Engine", glyph: "filter",
    note: "Change with every oil service (~5k mi). A cheap, routine item.", badges: ["CURATED"], base: 12 },
  timingbelt: { name: "Timing belt", replaceMi: "60k mi", group: "Engine", glyph: "belt",
    note: "On interference engines, replace on schedule (~60k mi) — do the water pump at the same time.", badges: ["CURATED"], base: 140 },
  transmission: { name: "Transmission", replaceMi: "fluid 60k", group: "Drivetrain", glyph: "gear",
    note: "Service the fluid on schedule; clutches wear on hard-driven cars.", badges: ["CURATED"], base: 0 },
  driveshaft: { name: "Driveshaft", replaceMi: "inspect 100k", group: "Drivetrain", glyph: "shaft",
    note: "Inspect U-joints and the carrier bearing around 100k mi.", badges: ["CURATED"], base: 320 },
  rearaxle: { name: "Rear axle & diff", replaceMi: "fluid 30k", group: "Drivetrain", glyph: "axle",
    note: "Change the differential fluid ~30k mi; more often with track use.", badges: ["CURATED"], base: 40 },
  shocks: { name: "Shocks & springs", chip: "Suspension", replaceMi: "80k mi", group: "Suspension & Brakes", glyph: "spring",
    note: "OEM dampers fade by ~80k mi; a refresh restores the handling.", badges: ["CURATED"], base: 620 },
  brakes: { name: "Brake pads", replaceMi: "30–50k", group: "Suspension & Brakes", glyph: "disc",
    note: "Pads last ~30–50k mi depending on use; upgrade compound for track days.", badges: ["CURATED"], base: 90 },
  muffler: { name: "Muffler", replaceMi: "80–100k", group: "Exhaust", glyph: "exhaust",
    note: "~80–100k mi, or on rust-through. A rattle at idle usually means a broken internal baffle, not the whole exhaust.", badges: ["CURATED"], base: 120 },
  catback: { name: "Cat-back piping", chip: "Exhaust", replaceMi: "rust check", group: "Exhaust", glyph: "pipe",
    note: "Inspect for rust-through, especially the mid-pipe. Aftermarket cat-backs are a popular upgrade.", badges: ["CURATED"], base: 480 },
};

// On-car chip bands (8 systems) + bench grouping (all parts). Shared shape.
const LAYOUT = {
  onCar: {
    top: ["engine", "transmission", "catback", "muffler"],
    bottom: ["oilfilter", "shocks", "driveshaft", "rearaxle"],
  },
  bench: [
    { group: "Engine", ids: ["engine", "oilfilter", "timingbelt"] },
    { group: "Drivetrain", ids: ["transmission", "driveshaft", "rearaxle"] },
    { group: "Suspension & Brakes", ids: ["shocks", "brakes"] },
    { group: "Exhaust", ids: ["muffler", "catback"] },
  ],
};

// Per-car overrides: real OEM numbers + curated sources for showcase cars.
const OVERRIDES = {
  "toyota-supra": {
    engine: { detail: "2JZ-GTE" },
    transmission: { detail: "V160" },
    muffler: {
      oem: "17430-46220",
      badges: ["CURATED", "NHTSA · 2 COMPLAINTS"],
      srcOpts: { aftermarket: "PartsHub · aftermarket", best: "FlowTech stainless", oem: "Toyota OEM direct" },
      prices: { cheapest: 89, bestRated: 124, trusted: 189 },
    },
    oilfilter: { srcOpts: { best: "Denso OEM", oem: "Toyota OEM direct" }, prices: { cheapest: 7, bestRated: 9, trusted: 12 } },
  },
};

const kebab = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const short = (s) => (s || "").split("(")[0].trim().split(/[,;]/)[0].trim();

// Build the resolved explode dataset for a vehicle + its profile. Engine and
// transmission detail lines come from curated specs when present.
export function explodeFor(vehicle, profile) {
  const specs = profile?.specs || {};
  const slug = [vehicle?.make, vehicle?.model].map(kebab).filter(Boolean).join("-");
  const ov = OVERRIDES[slug] || {};

  const parts = {};
  for (const [id, p] of Object.entries(BASE)) {
    const o = ov[id] || {};
    const detail =
      o.detail ??
      (id === "engine" ? short(specs.engine)
      : id === "transmission" ? short(specs.transmission)
      : p.detail);
    // Sources: explicit override prices, else derived from the base price.
    let src = null;
    if (o.prices) {
      const opts = o.srcOpts || {};
      src = {
        cheapest: { tier: "CHEAPEST", price: o.prices.cheapest, vendor: opts.aftermarket || "PartsHub · aftermarket", rating: "4.2★ · 1.4k" },
        bestRated: { tier: "BEST RATED", price: o.prices.bestRated, vendor: opts.best || "TrustedBrand", rating: "4.8★ · 620" },
        trusted: { tier: "TRUSTED · EXACT", price: o.prices.trusted, vendor: opts.oem || "OEM direct", rating: "exact match" },
      };
    } else if (p.base > 0) {
      src = sources(p.base, o.srcOpts);
    }
    parts[id] = {
      id, ...p, detail,
      chip: p.chip || p.name,
      oem: o.oem || p.oem || null,
      badges: o.badges || p.badges,
      sources: src,
    };
  }
  return { parts, onCar: LAYOUT.onCar, bench: LAYOUT.bench };
}
