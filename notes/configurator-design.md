# Configurator / Vehicle Modding — System Design

> Goal: let a user interact with a vehicle in the Showroom and **mod it** — paint,
> then bolt-on parts (rims, spoilers, splitters), then true body swaps (bumpers,
> fenders). This doc is the architecture we agree on BEFORE building Tier 3.
> Grounded in the current code (2026-07-09) and the real FC3 model's mesh data.

---

## 1. Where we are today (current state)

- **`components/ShowroomMode.jsx`** — a polished configurator rail (BODY / PAINT /
  TRIM / PACKAGES + an "as configured" price) driven by per-car data in
  **`lib/config.js`**. It is a **visual mock**: selecting paint/trim/packages
  changes the *price and labels only*. Nothing touches the 3D car. Confirmed: the
  only material `.color` in the app is on the *procedural* placeholder
  (`CarModel.jsx`); no code recolors or alters the loaded GLB.
- **`components/CarModel.jsx` → `GLTFCar`** — clones the GLB, bakes the registry
  rotation, then **auto-fits**: scales so max dim = 3.4 units and grounds
  `box.min.y` to y=0. Registry can pin `scale`/`position` (Supra does).
- **`lib/models.js`** — the model registry: `slug → { url, rotation?, scale?, position? }`.
- **`lib/config.js`** — the configurator DATA (paint swatches are CSS gradients for
  the UI, NOT three.js colors — needs a solid hex added for real paint).
- Hotspots (`CarModel` `Hotspot`) are abstract spheres at **placeholder** positions,
  not tied to real geometry (open masterplan item 8.4).

**Takeaway:** the UI shell exists. The missing piece is the **config → 3D bridge**.
Building that bridge is "starting to interact with the vehicle."

---

## 2. Three mechanisms of "modding" (increasing difficulty)

| Mechanism | What it does | New 3D assets? | Example |
|---|---|---|---|
| **M1 — Material override** | Recolor / re-finish named materials at runtime | No | Body paint, matte vs gloss, caliper color, window tint |
| **M2 — Part visibility toggle** | Show/hide mesh sets that already exist in the base model | No | FC3 rear wing on/off, carbon splitter on/off |
| **M3 — Part substitution (swap)** | Hide the stock part's meshes, mount an alternate part GLB at an anchor | **Yes** (one GLB per option) | Different rims, bumpers, spoilers, fenders |

Tiers 1–2 (M1+M2) are achievable now with zero new assets. Tier 3 (M3) is the real
vision and is a **content pipeline + engineering** problem, not just code.

---

## 3. Reference model: the FC3's real structure

The FC3 GLB has richly **named, separable** meshes/materials (measured 2026-07-09,
223 meshes). This is what makes it the flagship moddable car.

**Body / paint materials:** `cuerpo` (the paint — already repainted white via
`_patchmat.mjs`), plus `negros` (blacks), `plasticos`, `cromos` (chrome), `luces`
(lights), `luzroja`/`luznaranja`, `vidrio`/`vidriotrasero`/`int_glass` (glass).

**Wheel/brake material groups (one set of 4):** `tyre`, `rim_inner`, `rim_outer`,
`rim_chrome`, `rim_logo`, `wheel_black`, `material_43` (tire detail),
`CIVIC_CALIPER`, `CIVIC_BRAKEDISC`.

**Aero:** `CIVIC_CARBON_EXT` (front splitter `Object_36` + skirts), a rear wing mesh
set (to be pinned down), `MIRROR`, `under` (undertray), `CIVIC_CAGES` (roll cage).

**Measured wheel-hub anchors** (model-LOCAL space, i.e. after the registry rotation
`[0, π/2, 0]` but BEFORE the auto-fit scale ≈ 0.7628). Derived from the 4 `tyre`
mesh bounding boxes:

| Anchor | position [x,y,z] | notes |
|---|---|---|
| `hubFR` (front-right) | `[ 1.333, 0.330, -0.766]` | hub height y≈0.33 |
| `hubFL` (front-left)  | `[ 1.333, 0.330,  0.766]` | tire outer radius ≈ 0.318 |
| `hubRR` (rear-right)  | `[-1.235, 0.330, -0.766]` | wheelbase ≈ 2.57 |
| `hubRL` (rear-left)   | `[-1.235, 0.330,  0.766]` | track (Z) ≈ 1.53 |

These are exactly the transforms a swapped rim GLB attaches to (times the fit scale).

---

## 4. Data model

Keep the model **geometry** registry (`models.js`) as-is. Add a parallel
**parts / configurability** layer — proposed new file `lib/parts.js`, keyed by the
same slug:

```js
// lib/parts.js  (sketch)
export const PARTS = {
  "honda-civic-si-10th-gen-fc3": {
    // M1: which materials receive body paint (rest keep their own material)
    paintTargets: ["cuerpo"],

    // M2/M3: logical parts → the mesh/material names that compose them.
    // Used to (a) toggle visibility and (b) hide the stock part before a swap.
    partGroups: {
      wheels:   ["tyre","rim_inner","rim_outer","rim_chrome","rim_logo","wheel_black","material_43"],
      spoiler:  [/* rear wing mesh set */],
      splitter: ["CIVIC_CARBON_EXT"],
    },

    // M3: named mount transforms in model-LOCAL (pre-fit) space.
    anchors: {
      hubFR: { position: [ 1.333, 0.330, -0.766], hubRadius: 0.318 },
      hubFL: { position: [ 1.333, 0.330,  0.766], hubRadius: 0.318, mirror: "z" },
      hubRR: { position: [-1.235, 0.330, -0.766], hubRadius: 0.318 },
      hubRL: { position: [-1.235, 0.330,  0.766], hubRadius: 0.318, mirror: "z" },
      // spoilerDeck: {...}, frontBumper: {...}  (later)
    },

    // Which swap SLOTS this car supports + which catalog serves each.
    slots: {
      wheels: { library: "rims", stock: "wheels", anchors: ["hubFR","hubFL","hubRR","hubRL"] },
    },
  },
};

// Interchangeable part catalogs, keyed by slot type. Rims are UNIVERSAL
// (hub-mounted, reused across cars); body parts get per-car/per-platform libraries.
export const PART_CATALOG = {
  rims: [
    { id: "stock",  name: "Stock Si",     stock: true },
    { id: "te37",   name: "6-spoke gold", url: "/models/parts/rims/te37.glb",  diameter: 0.64 },
    { id: "mesh",   name: "Mesh silver",  url: "/models/parts/rims/mesh.glb",  diameter: 0.64 },
  ],
};
```

Runtime **config object** (held in `ShowroomMode`, passed down to `CarModel`):

```js
{ paint: "#c41425", finish: "gloss",
  toggles: { spoiler: true, splitter: false },
  swaps:   { wheels: "te37" } }
```

---

## 5. Coordinate / part-authoring convention (the contract for M3)

Every swap part is authored to a **shared convention** so it drops onto an anchor
with only a small per-part fine-tune (same discipline as per-car `scale`/`rotation`):

- **Origin** at the mount point (rim: center of the hub face; bumper: the body seam).
- **Axes**: +X forward, +Y up, +Z left — matching the car AFTER its registry rotation.
- **Units**: real-world meters.
- Rims additionally declare their **outer diameter** so we scale to each car's
  `hubRadius` (a Civic hub ≠ a GT-R hub).

A part that follows this loads with `position = anchor.position`, an optional
`mirror` (flip Z for the left side), and `scale = car.hubRadius / part.radius`.

---

## 6. Runtime application (in `CarModel` / `GLTFCar`)

`GLTFCar` gains a `config` prop. Order of operations after clone + rotation:

1. **Fit** on the stock body as today (measure the base scene → scale + position).
2. **M1 paint**: `object.traverse`; for meshes whose material name ∈ `paintTargets`,
   clone the material once and set `.color`/roughness/metalness from `config`.
   (Clone so we never mutate the `useGLTF` cache shared across instances.)
3. **M2 toggles**: for each `partGroups[slot]`, set `mesh.visible` from `config.toggles`.
4. **M3 swaps**: for each `config.swaps[slot]`:
   - hide the stock group (`partGroups[slot.stock]`),
   - `useGLTF` the chosen part, clone it, and for each anchor attach a copy as a
     **child of the fitted `object`** (so it inherits the fit scale/position),
     positioned at `anchor.position`, mirrored/scaled per §5.

Attaching parts as children of the already-fitted group means anchors stay in
model-local units and "just work" under the same transform — no separate math.

Loading is async: parts stream in via Suspense like the base model; a swap shows the
stock part until its replacement resolves (no empty hub flash).

---

## 7. Click-to-select parts (unifies with hotspots / 8.4)

To "click the rim to change it": raycast on pointer-down → hit mesh → reverse-map
mesh name through `partGroups` → the logical slot → open that slot's picker in the
rail + highlight the group (emissive boost or an outline pass). This **replaces the
abstract hotspot spheres with real-geometry selection**, so the mechanical-breakdown
hotspots (8.4) and the mod-selection share one raycast/among-map foundation.

---

## 8. Fitment scoping (what's reusable vs car-specific)

- **Rims** — UNIVERSAL. Hub-mounted, one shared `rims` library reused by every car,
  scaled per-car by `hubRadius`. → **the correct first M3 slot.**
- **Spoilers** — mostly car-specific mounting (deck shape differs), but a library can
  be shared within a body platform.
- **Bumpers / fenders / side skirts** — CAR-SPECIFIC. A Civic bumper won't fit a
  Supra. Each becomes a per-car (or per-platform) library. Highest asset cost.

Implication: ship **rims across all hero cars** long before bumpers on any.

---

## 9. Asset pipeline (for M3 parts)

Mirrors the existing car-model pipeline:
1. **Source** licensed/CC part models (same license reality as cars — many are
   NC/"test only"; track in CREDITS).
2. **Normalize** with gltf-transform: recenter origin to the mount, orient to §5,
   scale to meters, then optimize (meshopt + WebP), like the car GLBs.
3. **QC** each part on the car with a `_render`/`_appview`-style harness (we already
   have this tooling) before commit — verify seating at the anchor.
4. Serve from `public/models/parts/<slot>/<id>.glb` (cache-busted like the cars).

---

## 10. Staged rollout (each step shippable)

1. **M1 paint on the FC3** — wire swatches → `cuerpo`. Builds the config→3D bridge.
   *(prep: add a solid `hex` to each paint in `config.js`.)*
2. **M2 toggles on the FC3** — spoiler / splitter on-off. First real "mod."
3. **M3 rims on the FC3** — hub anchors + 2–3 rim GLBs. First true swap.
4. **Generalize**: rims across the other hero cars (measure each car's hubs).
5. **Click-to-select** parts (folds in 8.4).
6. **Body parts** (spoilers, then bumpers/fenders) — per-car libraries.

---

## 11. Open decisions (need input before/with build)

1. **Part asset strategy**: source existing CC/licensed part models, commission them,
   or go **procedural** for rims (spoke count / diameter / color generated in code —
   avoids sourcing, gives infinite options, but looks less photoreal)?
2. **v1 slot scope**: rims only, or rims + spoiler?
3. **Real vs. generic catalog**: branded wheels (Volk TE37, BBS…) carry
   **trademark** risk; generic styles ("6-spoke", "mesh") are safe. Which?
4. **Per-car reach**: FC3-only flagship first (recommended), or rims on all 7 heroes?
5. **Pricing UI**: keep the "as configured" $ (mods add cost), or reframe as a
   build/parts list without MSRP?
6. **Persistence**: shareable build URLs (`?paint=…&wheels=te37`) in v1 or later?

---

## 12. Recommendation

Build in the order of §10. Even though the vision is Tier 3, **M1+M2 on the FC3 ship
this week with no assets** and stand up the entire config→3D→click plumbing that M3
reuses. Then rims (procedural is worth strong consideration for v1 — zero sourcing,
infinite options) become the first true swap on the flagship FC3.
