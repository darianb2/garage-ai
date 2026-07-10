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
  // Length runs along Z (like the Civic/GT-R), so face it with a +90 deg Y turn.
  // Its front-left wheel mesh carries stray off-model vertices that inflate the
  // bounding box ~0.55 below the car, so the default auto-fit grounds to that
  // phantom point and the car floats. Pin an explicit scale + position (measured
  // from the clean body meshes, excluding that wheel) to seat it like the others.
  "toyota-supra-a80-mk4": { url: "/models/toyota-supra-a80-mk4.glb", rotation: [0, Math.PI / 2, 0], scale: 0.74032, position: [-0.106, -0.0797, 0] },

  // 2023 Honda Civic Type R (FL5) — by Ddiaz Design, CC-BY-NC-SA-4.0 (NonCommercial:
  // test only). Meshopt + WebP optimized (18.8MB glTF -> 2.8MB GLB). Model's length
  // is along Z with the nose at +Z; rotate +90° about Y so the nose faces +X (toward
  // the camera), matching the procedural car and the Supra.
  "honda-civic-type-r-fl5": { url: "/models/honda-civic-type-r-fl5.glb", rotation: [0, Math.PI / 2, 0] },

  // 2012 Honda Civic Si Coupe (9th-gen FG4) — by Ddiaz Design, CC-BY-NC-SA-4.0
  // (NonCommercial ShareAlike: test only, same as the FL5 above). Meshopt + WebP
  // optimized (3.65MB Sketchfab GLB -> 886KB). Same Ddiaz/Forza export as the FL5:
  // length runs along Z with the nose at +Z, so rotate +90° about Y to face +X.
  "honda-civic-si-9th-gen-fg4": { url: "/models/honda-civic-si-9th-gen-fg4.glb", rotation: [0, Math.PI / 2, 0] },

  // 10th-gen Honda Civic Si Coupe (FC3, 2016-2020) — by vecarz (@heynic), CC-BY-NC-SA-4.0
  // (NonCommercial ShareAlike: test only, same class as the FG4/FL5 above). A Sketchfab
  // export at real-world meter scale (bbox ~4.46m length along Z); 823K tris + 8 stray UV
  // sets optimized to 3.5MB (simplify + prune + WebP + meshopt). NOTE: optimize was run
  // WITHOUT --palette/--prune-solid-textures — the palette merge turned the body paint
  // ("cuerpo") into a transparent BLEND material, which read as the car floating +
  // discolored. Its native paint is grey (0.51) metallic; repainted white (0.95, metalness
  // 0 so the clearcoat reads as paint, not chrome). Length runs along Z like the Civic
  // FG4/FL5 and GT-R, so rotate +90° about Y to face +X.
  // ?v=2 cache-busts browsers that hard-cached an earlier broken export of this
  // file (models are served with a 30-day cache under a stable filename, so a
  // re-export otherwise keeps showing the stale one). Bump on any re-export.
  "honda-civic-si-10th-gen-fc3": { url: "/models/honda-civic-si-10th-gen-fc3.glb?v=2", rotation: [0, Math.PI / 2, 0] },

  // --- The 4 locked launch cars (all CC-BY-4.0: commercial use OK with credit) ---
  // Mazda MX-5 Miata (ND) — by Nieve5677. Source is Z-up with its length along Y;
  // stand it upright (X -90) and yaw the nose to +X (Z +90) so it faces the camera.
  "mazda-mx-5-miata-nd": { url: "/models/mazda-mx-5-miata-nd.glb", rotation: [-Math.PI / 2, 0, Math.PI / 2] },

  // BMW M3 (E46) — by pIxEL183. Already Y-up with the nose at +X (no rotation needed).
  // A stray ground plane (pPlane1) was stripped during optimization.
  "bmw-m3-e46": { url: "/models/bmw-m3-e46.glb" },

  // Nissan GT-R (R35) — by Black Snow. Length runs along Z; yaw +90° about Y so the
  // nose faces +X, like the Civic.
  "nissan-gt-r-r35": { url: "/models/nissan-gt-r-r35.glb", rotation: [0, Math.PI / 2, 0] },

  // DEMO ONLY: CC0 "ToyCar" (Khronos) standing in to prove the loader — NOT a real
  // car. Replace with a real model + a registry line above, then delete.
  "toyota-gr-supra": { url: "/models/demo-car.glb", demo: true },

  // --- Add more real models (drop file in public/models/, then add a line) ---
  // "toyota-gr-supra-a90":    { url: "/models/toyota-gr-supra-a90.glb" },
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
  return MODELS[modelSlugFor(vehicle)] || null;
}

// The registry key a vehicle resolves to (or null). Same as the descriptor lookup,
// but returns the matched slug — used to fetch that model's Teardown breakdown,
// which is keyed by this exact slug (e.g. "honda-civic-si-10th-gen-fc3").
export function modelSlugFor(vehicle) {
  if (!vehicle) return null;
  const keys = [
    primarySlug(vehicle),
    [vehicle.make, vehicle.model].map(kebab).filter(Boolean).join("-"),
  ];
  for (const k of keys) if (k && MODELS[k]) return k;
  return null;
}
