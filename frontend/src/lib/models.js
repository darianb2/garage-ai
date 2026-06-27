// Registry of real 3D car models we have on disk (frontend/public/models/*.glb).
//
// HOW TO ADD A MODEL:
//   1. Put the file at frontend/public/models/<slug>.glb
//   2. Add a line below mapping that slug to it (optionally tune scale/rotation
//      /position — real models vary wildly in size and orientation).
// A vehicle with no matching entry falls back to the procedural car, so nothing
// breaks while the registry is incomplete.
//
// The slug is resolved from the vehicle, trying the generation-specific key
// first, then make+model. See primarySlug() for the exact name to use.
export const MODELS = {
  // --- Real models (CC-licensed; attributions in public/models/CREDITS.md) ---
  // Toyota Supra Mk4 / A80 — by temich, CC-BY-NC-4.0 (NonCommercial: test only).
  "toyota-supra-a80-mk4": { url: "/models/toyota-supra-a80-mk4.glb", rotation: [0, Math.PI, 0] },

  // DEMO ONLY: CC0 "ToyCar" (Khronos) standing in to prove the loader — NOT real
  // cars. Replace each with a real model + a registry line above, then delete.
  "toyota-gr-supra": { url: "/models/demo-car.glb", demo: true },
  "honda-civic-type-r": { url: "/models/demo-car.glb", demo: true },

  // --- Add more real models (drop file in public/models/, then add a line) ---
  // "toyota-gr-supra-a90":    { url: "/models/toyota-gr-supra-a90.glb" },
  // "honda-civic-type-r-fl5": { url: "/models/honda-civic-type-r-fl5.glb" },
};

const kebab = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// The preferred slug for a vehicle (generation-specific). Shown to the user as
// the filename to drop in when we fall back to the procedural placeholder.
export function primarySlug(vehicle) {
  if (!vehicle) return null;
  const base = [vehicle.make, vehicle.model, vehicle.generation].map(kebab).filter(Boolean);
  return base.join("-");
}

// Resolve a vehicle to a model descriptor ({ url, scale?, rotation?, position? })
// or null if we don't have one yet.
export function modelFor(vehicle) {
  if (!vehicle) return null;
  const keys = [
    primarySlug(vehicle),
    [vehicle.make, vehicle.model].map(kebab).filter(Boolean).join("-"),
  ];
  for (const k of keys) if (k && MODELS[k]) return MODELS[k];
  return null;
}
