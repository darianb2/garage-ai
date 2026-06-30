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

export const IMAGES = {
  // --- Owner-supplied / licensed photos go here (none yet) ---
  // "toyota-supra-a80-mk4": "/images/toyota-supra-a80-mk4.jpg",
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
