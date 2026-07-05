// Registry of hero photos for cars (frontend/public/images/<slug>.{jpg,webp}).
//
// Mirrors lib/models.js: resolve a vehicle to its image by the generation-specific
// slug first, then make+model. A car with no image falls back to a styled
// placeholder (see CarImage), so every car looks intentional even before a photo
// exists. Images must be owner-supplied / licensed — DO NOT scrape. To light one
// up, either drop a file in public/images/ and add a line below, or set a
// `heroImage` field on the catalog entry (that explicit field wins).
import { primarySlug } from "./models";

const kebab = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Wikimedia Commons, free licenses (CC0 / public-domain / CC-BY / CC-BY-SA).
// Sourced + optimized by scripts/fetch_images.py; attribution in
// public/images/CREDITS.md. Keyed by primarySlug so heroFor() resolves them.
// Regenerate this map from disk after a fetch run (one entry per public/images/*.webp).
export const IMAGES = {
  "audi-s3-8v": "/images/audi-s3-8v.webp",
  "bmw-1-series-m-e82": "/images/bmw-1-series-m-e82.webp",
  "bmw-m3-e30": "/images/bmw-m3-e30.webp",
  "bmw-m3-e36": "/images/bmw-m3-e36.webp",
  "bmw-m3-e46": "/images/bmw-m3-e46.webp",
  "bmw-m3-e92": "/images/bmw-m3-e92.webp",
  "honda-civic-si-10th-gen-fc1": "/images/honda-civic-si-10th-gen-fc1.webp",
  "honda-civic-si-10th-gen-fc3": "/images/honda-civic-si-10th-gen-fc3.webp",
  "honda-civic-si-11th-gen-fe1": "/images/honda-civic-si-11th-gen-fe1.webp",
  "honda-civic-si-5th-gen-eg": "/images/honda-civic-si-5th-gen-eg.webp",
  "honda-civic-si-6th-gen-em1": "/images/honda-civic-si-6th-gen-em1.webp",
  "honda-civic-si-7th-gen-ep3": "/images/honda-civic-si-7th-gen-ep3.webp",
  "honda-civic-si-8th-gen-fa5": "/images/honda-civic-si-8th-gen-fa5.webp",
  "honda-civic-si-8th-gen-fg2": "/images/honda-civic-si-8th-gen-fg2.webp",
  "honda-civic-si-9th-gen-fb6": "/images/honda-civic-si-9th-gen-fb6.webp",
  "honda-civic-si-9th-gen-fg4": "/images/honda-civic-si-9th-gen-fg4.webp",
  "honda-civic-type-r-fk2": "/images/honda-civic-type-r-fk2.webp",
  "honda-civic-type-r-fk8": "/images/honda-civic-type-r-fk8.webp",
  "honda-civic-type-r-fl5": "/images/honda-civic-type-r-fl5.webp",
  "honda-cr-v-5th-gen-rw": "/images/honda-cr-v-5th-gen-rw.webp",
  "honda-fit-3rd-gen-gk": "/images/honda-fit-3rd-gen-gk.webp",
  "honda-hr-v-1st-gen-ru": "/images/honda-hr-v-1st-gen-ru.webp",
  "honda-insight-3rd-gen-ze4": "/images/honda-insight-3rd-gen-ze4.webp",
  "honda-odyssey-5th-gen-rl6": "/images/honda-odyssey-5th-gen-rl6.webp",
  "honda-pilot-3rd-gen": "/images/honda-pilot-3rd-gen.webp",
  "honda-s2000-ap1-ap2": "/images/honda-s2000-ap1-ap2.webp",
  "mazda-mx-5-miata-na": "/images/mazda-mx-5-miata-na.webp",
  "mazda-mx-5-miata-nb": "/images/mazda-mx-5-miata-nb.webp",
  "mazda-mx-5-miata-nc": "/images/mazda-mx-5-miata-nc.webp",
  "mazda-mx-5-miata-nd": "/images/mazda-mx-5-miata-nd.webp",
  "nissan-370z-z34": "/images/nissan-370z-z34.webp",
  "nissan-gt-r-r35": "/images/nissan-gt-r-r35.webp",
  "subaru-wrx-gd-blobeye": "/images/subaru-wrx-gd-blobeye.webp",
  "subaru-wrx-va": "/images/subaru-wrx-va.webp",
  "toyota-4runner-5th-gen-n280": "/images/toyota-4runner-5th-gen-n280.webp",
  "toyota-avalon-5th-gen-xx50": "/images/toyota-avalon-5th-gen-xx50.webp",
  "toyota-camry-8th-gen-xv70": "/images/toyota-camry-8th-gen-xv70.webp",
  "toyota-corolla-12th-gen-e210": "/images/toyota-corolla-12th-gen-e210.webp",
  "toyota-corolla-ae86": "/images/toyota-corolla-ae86.webp",
  "toyota-corolla-cross-1st-gen": "/images/toyota-corolla-cross-1st-gen.webp",
  "toyota-gr-corolla-e210": "/images/toyota-gr-corolla-e210.webp",
  "toyota-gr-supra-a90": "/images/toyota-gr-supra-a90.webp",
  "toyota-gr86-zn8": "/images/toyota-gr86-zn8.webp",
  "toyota-highlander-4th-gen-xu70": "/images/toyota-highlander-4th-gen-xu70.webp",
  "toyota-mr2-spyder-zzw30": "/images/toyota-mr2-spyder-zzw30.webp",
  "toyota-prius-4th-gen-xw50": "/images/toyota-prius-4th-gen-xw50.webp",
  "toyota-rav4-5th-gen-xa50": "/images/toyota-rav4-5th-gen-xa50.webp",
  "toyota-sienna-4th-gen-xl40": "/images/toyota-sienna-4th-gen-xl40.webp",
  "toyota-supra-a80-mk4": "/images/toyota-supra-a80-mk4.webp",
  "toyota-tacoma-3rd-gen": "/images/toyota-tacoma-3rd-gen.webp",
  "toyota-tundra-3rd-gen": "/images/toyota-tundra-3rd-gen.webp",
  "toyota-yaris-mazda2-based": "/images/toyota-yaris-mazda2-based.webp",
  "volkswagen-golf-gti-mk6": "/images/volkswagen-golf-gti-mk6.webp",
};

// Resolve a vehicle to a hero image URL, or null when we don't have one yet.
export function heroFor(vehicle) {
  if (!vehicle) return null;
  if (vehicle.heroImage) return vehicle.heroImage; // explicit data-model field wins
  const keys = [
    primarySlug(vehicle),
    [vehicle.make, vehicle.model].map(kebab).filter(Boolean).join("-"),
  ];
  for (const k of keys) if (k && IMAGES[k]) return IMAGES[k];
  return null;
}
