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
  // it is what the Showroom paint swatches drive (M1). It's also the only car with
  // M2 toggles so far — its GLB is a track-prepped Si with genuinely separable
  // bolt-ons. Hub anchors for M3 rim swaps come later.
  "honda-civic-si-10th-gen-fc3": {
    paintTargets: ["cuerpo"],
    // The model's as-authored body colour (the shell is white in the GLB), offered
    // as a selectable "Original" swatch. Selecting it applies NO paint override, so
    // you see the model exactly as authored. It's the default so the car opens in
    // its true colour and paint becomes an opt-in mod.
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#fafafa,#dcdde0)" },

    // M2 — part visibility groups. Matched on MESH name, not material name (which is
    // what paint and the Teardown match on): one material routinely spans several
    // parts, so this GLB's CIVIC_CARBON_EXT covers the front splitter AND the
    // interior door trim. Mesh names + bounds measured from the GLB with
    //   cd frontend && node scripts/model_meshes.mjs /models/honda-civic-si-10th-gen-fc3.glb --meshes
    // Bounds quoted below are fitted car space (+X nose, +Y up, ±Z sides, car ≈3.4 long).
    partGroups: {
      splitter: ["Object_36"], // carbon front lip — x 1.30→1.70 (nose), y 0.11→0.18 (low), full width
      cage: ["Object_110", "Object_256"], // bolt-in roll cage (CIVIC_CAGES) — spans the cabin
    },
    // Which groups the Showroom offers as on/off mods, in rail order. The GLB ships
    // both parts fitted, so both default on (`on: true`) and toggling is subtractive.
    // NOTE: there is deliberately NO rear-wing toggle. This GLB's body is two fused
    // `cuerpo` meshes, so any decklid lip is baked into the shell and can't be hidden
    // without hiding the whole car — a wing needs an M3 swap (a separate part GLB).
    mods: [
      { id: "splitter", label: "Carbon front splitter", sub: "front lip", on: true },
      { id: "cage", label: "Bolt-in roll cage", sub: "cabin", on: true },
    ],
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
  // C8 Z06 — body paint is a single solid-colour mesh on the "…Paint_Material"
  // (native Elkhart Lake Blue, factor 0,0.02,0.28), so paint recolours it cleanly
  // like the Supra/FG4 — not locked. Its aero/panels ride other materials (Coloured
  // /Base/Carbon1) and stay as authored. "Original" restores the deep blue.
  "chevrolet-corvette-c8-z06": {
    paintTargets: ["Chevrolet_CorvetteZ06RewardRecycled_2023Paint_Material"],
    stockPaint: { id: "stock", name: "Original", fill: "linear-gradient(145deg,#16357e,#08183f)" },
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

// The as-delivered M2 toggle state for a car: { [modId]: boolean }. Every mod the
// car declares is listed explicitly, so the renderer can treat a missing key as
// "this car has no such part" rather than guessing. `{}` for cars with no mods.
export function modDefaults(parts) {
  return Object.fromEntries((parts?.mods || []).map((m) => [m.id, m.on !== false]));
}
