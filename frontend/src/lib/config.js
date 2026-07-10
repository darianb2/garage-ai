// Showroom configurator data (design ref #4a Showroom). Per-car body / paint /
// trim / packages + a base MSRP; the rail sums package deltas into "as configured"
// live. Illustrative period pricing — wire to real data later. Keyed by a slug so
// the four launch cars each get a real configurator; other cars fall back to a
// stage-only Showroom (configFor returns null).

const CONFIGS = {
  "toyota-supra": {
    msrpBase: 40508,
    msrpLabel: "1998 MSRP",
    body: [
      { id: "hardtop", label: "Hardtop" },
      { id: "sportroof", label: "Sport Roof" },
    ],
    paintYear: "FACTORY 1998",
    paint: [
      { id: "red", name: "Renaissance Red", fill: "linear-gradient(145deg,#c23232,#7a1616)" },
      { id: "white", name: "Super White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "silver", name: "Alpine Silver", fill: "linear-gradient(145deg,#c9ced3,#8a9098)" },
      { id: "black", name: "Anthracite", fill: "linear-gradient(145deg,#3b3b40,#141416)" },
      { id: "blue", name: "Royal Sapphire", fill: "linear-gradient(145deg,#2b4a8c,#152747)" },
      { id: "green", name: "British Green", fill: "linear-gradient(145deg,#256b45,#0f3020)" },
    ],
    trim: [
      { id: "base", name: "Base", sub: "2JZ-GE · 220 hp" },
      { id: "turbo", name: "Turbo", sub: "2JZ-GTE · 320 hp" },
    ],
    packages: [
      { id: "manual", label: "6-speed manual (V160)", price: 0 },
      { id: "spoiler", label: "Rear spoiler", price: 420 },
      { id: "leather", label: "Leather package", price: 1210 },
    ],
    defaults: { body: "sportroof", paint: "red", trim: "turbo", packages: ["manual", "spoiler"] },
  },

  "mazda-mx-5-miata": {
    msrpBase: 30290,
    msrpLabel: "2019 MSRP",
    body: [
      { id: "soft", label: "Soft Top" },
      { id: "rf", label: "RF" },
    ],
    paintYear: "2019 PALETTE",
    paint: [
      { id: "soulred", name: "Soul Red Crystal", fill: "linear-gradient(145deg,#c41425,#7a0d18)" },
      { id: "white", name: "Snowflake White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "gray", name: "Machine Gray", fill: "linear-gradient(145deg,#4a4d52,#232529)" },
      { id: "black", name: "Jet Black", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
      { id: "blue", name: "Eternal Blue", fill: "linear-gradient(145deg,#26456f,#132540)" },
    ],
    trim: [
      { id: "club", name: "Club", sub: "2.0 Skyactiv · 181 hp · LSD" },
      { id: "gt", name: "Grand Touring", sub: "2.0 Skyactiv · 181 hp · leather" },
    ],
    packages: [
      { id: "manual", label: "6-speed manual", price: 0 },
      { id: "brembo", label: "Brembo/BBS package", price: 4670 },
      { id: "bose", label: "Bose + heated seats", price: 900 },
    ],
    defaults: { body: "soft", paint: "soulred", trim: "club", packages: ["manual"] },
  },

  "bmw-m3": {
    msrpBase: 46800,
    msrpLabel: "2003 MSRP",
    body: [
      { id: "coupe", label: "Coupe" },
      { id: "vert", label: "Convertible" },
    ],
    paintYear: "FACTORY 2003",
    paint: [
      { id: "lagunaseca", name: "Laguna Seca Blue", fill: "linear-gradient(145deg,#4aa6d6,#1e5f86)" },
      { id: "silvergray", name: "Silver Gray", fill: "linear-gradient(145deg,#c9ced3,#8a9098)" },
      { id: "black", name: "Jet Black", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
      { id: "imola", name: "Imola Red", fill: "linear-gradient(145deg,#c22626,#7a1414)" },
      { id: "steel", name: "Steel Gray", fill: "linear-gradient(145deg,#4a4d52,#232529)" },
    ],
    trim: [
      { id: "smg", name: "SMG II", sub: "S54 · 333 hp · paddle" },
      { id: "manual", name: "6-speed", sub: "S54 · 333 hp · manual" },
    ],
    packages: [
      { id: "sixmt", label: "6-speed manual (Getrag)", price: 0 },
      { id: "compthrottle", label: "Competition wheels", price: 1200 },
      { id: "nav", label: "Navigation + premium", price: 2600 },
    ],
    defaults: { body: "coupe", paint: "lagunaseca", trim: "manual", packages: ["sixmt"] },
  },

  "nissan-gt-r": {
    msrpBase: 111585,
    msrpLabel: "2017 MSRP",
    body: [{ id: "premium", label: "Premium" }, { id: "black", label: "Black Edition" }],
    paintYear: "2017 PALETTE",
    paint: [
      { id: "pearlwhite", name: "Pearl White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "gunmetal", name: "Gun Metallic", fill: "linear-gradient(145deg,#4a4d52,#232529)" },
      { id: "black", name: "Jet Black", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
      { id: "red", name: "Solid Red", fill: "linear-gradient(145deg,#c22626,#7a1414)" },
      { id: "blue", name: "Deep Blue Pearl", fill: "linear-gradient(145deg,#25406f,#132540)" },
    ],
    trim: [
      { id: "premium", name: "Premium", sub: "VR38 · 565 hp" },
      { id: "nismo", name: "NISMO", sub: "VR38 · 600 hp" },
    ],
    packages: [
      { id: "auto", label: "6-speed dual-clutch", price: 0 },
      { id: "ccb", label: "Carbon-ceramic brakes", price: 0 },
      { id: "interior", label: "Premium interior package", price: 4090 },
    ],
    defaults: { body: "premium", paint: "pearlwhite", trim: "premium", packages: ["auto"] },
  },

  "honda-civic-type-r": {
    msrpBase: 42895,
    msrpLabel: "2023 MSRP",
    body: [{ id: "hatch", label: "Hatch" }],
    paintYear: "2023 PALETTE",
    paint: [
      { id: "championship", name: "Championship White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "rallyered", name: "Rallye Red", fill: "linear-gradient(145deg,#c8202a,#7c1016)" },
      { id: "boostblue", name: "Boost Blue Pearl", fill: "linear-gradient(145deg,#2f74c4,#173f75)" },
      { id: "sonicgray", name: "Sonic Gray Pearl", fill: "linear-gradient(145deg,#5a6066,#2c3034)" },
      { id: "crystalblack", name: "Crystal Black Pearl", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
    ],
    trim: [{ id: "typer", name: "Type R", sub: "K20C1 · 315 hp · 6MT" }],
    packages: [
      { id: "manual", label: "6-speed manual (standard)", price: 0 },
      { id: "hpd", label: "HPD aero package", price: 3200 },
      { id: "illum", label: "Illumination package", price: 425 },
    ],
    defaults: { body: "hatch", paint: "championship", trim: "typer", packages: ["manual"] },
  },

  "chevrolet-corvette": {
    msrpBase: 106395,
    msrpLabel: "2023 MSRP",
    body: [
      { id: "coupe", label: "Coupe" },
      { id: "convertible", label: "Convertible" },
    ],
    paintYear: "2023 PALETTE",
    paint: [
      { id: "arcticwhite", name: "Arctic White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "torchred", name: "Torch Red", fill: "linear-gradient(145deg,#c8202a,#7c1016)" },
      { id: "amplifyorange", name: "Amplify Orange", fill: "linear-gradient(145deg,#e0561d,#8f300c)" },
      { id: "rapidblue", name: "Rapid Blue", fill: "linear-gradient(145deg,#2f74c4,#173f75)" },
      { id: "hypersonicgray", name: "Hypersonic Gray", fill: "linear-gradient(145deg,#5a6066,#2c3034)" },
      { id: "carbonflash", name: "Carbon Flash", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
    ],
    trim: [
      { id: "1lz", name: "1LZ", sub: "LT6 · 670 hp · base" },
      { id: "z07", name: "Z07 Track", sub: "LT6 · 670 hp · aero + CCB" },
    ],
    packages: [
      { id: "dct", label: "8-speed dual-clutch (standard)", price: 0 },
      { id: "z07", label: "Z07 Performance Package", price: 8995 },
      { id: "cfwheels", label: "Carbon-fiber wheels", price: 9995 },
    ],
    defaults: { body: "coupe", paint: "torchred", trim: "z07", packages: ["dct"] },
  },

  "honda-civic-si": {
    msrpBase: 22715,
    msrpLabel: "2014 MSRP",
    body: [{ id: "coupe", label: "Coupe" }],
    paintYear: "2014 PALETTE",
    paint: [
      { id: "rallyered", name: "Rallye Red", fill: "linear-gradient(145deg,#c8202a,#7c1016)" },
      { id: "white", name: "Taffeta White", fill: "linear-gradient(145deg,#f6f6f3,#d7d7d1)" },
      { id: "silver", name: "Alabaster Silver", fill: "linear-gradient(145deg,#c9ced3,#8a9098)" },
      { id: "steel", name: "Modern Steel", fill: "linear-gradient(145deg,#4a4d52,#232529)" },
      { id: "dynoblue", name: "Dyno Blue Pearl", fill: "linear-gradient(145deg,#26456f,#132540)" },
      { id: "black", name: "Crystal Black Pearl", fill: "linear-gradient(145deg,#2a2a2e,#101012)" },
    ],
    trim: [
      { id: "si", name: "Si", sub: "K24Z7 · 205 hp · 6MT" },
      { id: "sihfp", name: "Si HFP", sub: "Honda Factory Performance" },
    ],
    packages: [
      { id: "manual", label: "6-speed manual (standard)", price: 0 },
      { id: "summer", label: "HFP 18\" wheels + summer tires", price: 1400 },
      { id: "nav", label: "Satellite-linked navigation", price: 1500 },
    ],
    defaults: { body: "coupe", paint: "rallyered", trim: "si", packages: ["manual"] },
  },
};

const kebab = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// The paint swatches store colour as a CSS gradient (for the chip). The 3D body
// paint uses that gradient's FIRST stop as its solid colour — one source of truth,
// no separate hex to keep in sync. Returns "#rrggbb" or null.
export function paintHex(fill) {
  const m = (fill || "").match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})/i);
  return m ? m[0] : null;
}

// Resolve a vehicle to its configurator, or null when we don't have one (Showroom
// then shows the stage only).
export function configFor(vehicle) {
  if (!vehicle) return null;
  const keys = [
    [vehicle.make, vehicle.model].map(kebab).filter(Boolean).join("-"),
  ];
  for (const k of keys) if (CONFIGS[k]) return CONFIGS[k];
  return null;
}
