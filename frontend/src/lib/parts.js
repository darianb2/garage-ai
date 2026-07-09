// Configurability / parts layer — parallel to lib/models.js. Declares, per car,
// what can be modded: which materials take body paint (M1), and later which mesh
// groups toggle (M2) and which anchors/slots accept swapped parts (M3). See
// notes/configurator-design.md. Keyed by the SAME slug as the model registry
// (generation-specific first, then make+model), so parts resolve like models do.
import { primarySlug } from "./models";

const kebab = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const PARTS = {
  // 10th-gen Civic Si (FC3) — the flagship moddable car. Body paint lives on the
  // "cuerpo" material (the shell that was repainted white in the GLB); recolouring
  // it is what the Showroom paint swatches drive (M1). Wheel/aero groups + hub
  // anchors (measured from the GLB, model-local pre-fit space) will be added here
  // for M2/M3 — omitted until those tiers land so this stays the minimal M1 change.
  "honda-civic-si-10th-gen-fc3": {
    paintTargets: ["cuerpo"],
    // The model's as-authored body colour (the shell is white in the GLB), offered
    // as a selectable "Original" swatch. Selecting it applies NO paint override, so
    // you see the model exactly as authored. It's the default so the car opens in
    // its true colour and paint becomes an opt-in mod.
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#fafafa,#dcdde0)" },
  },
};

// Resolve a vehicle to its parts/config descriptor, or null when we don't have one
// yet (Showroom paint/toggles then no-op and the model shows exactly as authored).
export function partsFor(vehicle) {
  if (!vehicle) return null;
  const keys = [
    primarySlug(vehicle),
    [vehicle.make, vehicle.model].map(kebab).filter(Boolean).join("-"),
  ];
  for (const k of keys) if (k && PARTS[k]) return PARTS[k];
  return null;
}
