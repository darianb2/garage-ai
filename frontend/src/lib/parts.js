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

  // The other five launch cars. Each `paintTargets` is the EXACT body material name
  // in that GLB (the paint effect matches material.name exactly), and `stockPaint`
  // is an "Original" swatch approximating the model's authored body colour. Supra
  // (`Paint`) and FG4 (`CIVIC13`) are solid-colour materials → paint recolours them
  // cleanly; FL5/GT-R/Miata/M3 bodies are textured (white factor), so paint tints
  // the texture. Keyed by the same generation slug as MODELS + data/breakdowns.
  "toyota-supra-a80-mk4": {
    paintTargets: ["Paint"],
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#1c1922,#08060e)" },
  },
  "honda-civic-type-r-fl5": {
    paintTargets: ["Honda_CivicTypeRRewardRecycled_2023Coloured_Material"],
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#f2f3f4,#d9dbdd)" },
  },
  "honda-civic-si-9th-gen-fg4": {
    paintTargets: ["CIVIC13"],
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#7e0d06,#4a0200)" },
  },
  "nissan-gt-r-r35": {
    paintTargets: ["PaletteMaterial001"],
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#e8c53a,#b8951c)" },
  },
  // Miata + M3 are PALETTE-MERGED: the whole exterior is one material (and on the
  // Miata that mesh includes the wheels). Recolouring it tints the baked texture —
  // muddy on their saturated authored paint (red / blue) and it would recolour the
  // wheels too — so paint is LOCKED to "Original" (paintLocked hides the palette in
  // ShowroomMode). The car shows its authored colour; the Teardown still works.
  "mazda-mx-5-miata-nd": {
    paintTargets: ["PaletteMaterial001"],
    paintLocked: true,
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#8a1f12,#4a0d06)" },
  },
  "bmw-m3-e46": {
    paintTargets: ["PaletteMaterial002"],
    paintLocked: true,
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#2c47c4,#152670)" },
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
