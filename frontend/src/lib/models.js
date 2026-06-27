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
  // DEMO ONLY: a CC0 public-domain car (Khronos "ToyCar", by Guido Odendahl &
  // Eric Chadwick) standing in to prove the loader works. It is NOT an accurate
  // Supra/Civic. Delete these three lines once real per-car models are in.
  "toyota-supra": { url: "/models/demo-car.glb", demo: true },
  "toyota-gr-supra": { url: "/models/demo-car.glb", demo: true },
  "honda-civic-type-r": { url: "/models/demo-car.glb", demo: true },

  // --- Toyota Supra (add files, then uncomment) ---
  // "toyota-supra-a80-mk4": { url: "/models/toyota-supra-a80-mk4.glb", scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] },
  // "toyota-gr-supra-a90":  { url: "/models/toyota-gr-supra-a90.glb" },
  // --- Honda Civic ---
  // "honda-civic-type-r-fl5": { url: "/models/honda-civic-type-r-fl5.glb" },
  // "honda-civic-si":         { url: "/models/honda-civic-si.glb" },
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
