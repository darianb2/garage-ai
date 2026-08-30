# Configurator / Vehicle Modding — System Design

> Goal: let a user interact with a vehicle in the Showroom and **mod it** — paint,
> then bolt-on parts (rims, spoilers, splitters), then true body swaps (bumpers,
> fenders). This doc is the architecture we agree on BEFORE building Tier 3.
> Grounded in the current code and the real FC3 model's mesh data. Written
> 2026-07-09; §1, §3, §4, §7 and §10 corrected 2026-08-24 once M1/M2 were actually
> built and the model's real limits were measured — see the ⚠️ notes.

---

## 1. Where we are today (current state)

- **`components/ShowroomMode.jsx`** — the configurator rail (BODY / PAINT / MODS /
  TRIM / PACKAGES + an "as configured" price) driven by per-car data in
  **`lib/config.js`**. **No longer a mock** — as of M1/M2 the PAINT swatches and the
  MODS checkboxes drive the real GLB. TRIM / PACKAGES are still labels-and-price only.
- **`components/CarModel.jsx` → `GLTFCar`** — clones the GLB, bakes the registry
  rotation, then **auto-fits**: scales so max dim = 3.4 units and grounds
  `box.min.y` to y=0. Registry can pin `scale`/`position` (Supra does).
- **`lib/models.js`** — the model registry: `slug → { url, rotation?, scale?, position? }`.
- **`lib/config.js`** — the configurator DATA (paint swatches are CSS gradients for
  the UI, NOT three.js colors — needs a solid hex added for real paint).
- Hotspots (`CarModel` `Hotspot`) are abstract spheres at **placeholder** positions,
  not tied to real geometry (open masterplan item 8.4).

**Takeaway (2026-08-24):** the config → 3D bridge is BUILT. M1 paint, M2 visibility
toggles, and click-to-remove picking all ship on the FC3. What's left is **M3 (part
substitution)** and widening M2 past one car — both gated on assets and on each GLB's
mesh split, not on this plumbing.

---

## 2. Three mechanisms of "modding" (increasing difficulty)

| Mechanism | What it does | New 3D assets? | Example |
|---|---|---|---|
| **M1 — Material override** | Recolor / re-finish named materials at runtime | No | Body paint, matte vs gloss, caliper color, window tint |
| **M2 — Part visibility toggle** | Show/hide mesh sets that already exist in the base model | No | FC3 carbon splitter on/off, roll cage on/off (⚠️ NOT the rear wing — see §3) |
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

**Aero:** `CIVIC_CARBON_EXT`, `MIRROR`, `under` (undertray), `CIVIC_CAGES` (roll cage).

> ⚠️ **CORRECTED 2026-08-24 — this section originally overpromised.** A per-mesh dump
> (`node scripts/model_meshes.mjs /models/<slug>.glb --meshes`) settled what is really
> separable on this GLB:
>
> - **Front splitter = mesh `Object_36`** only. ✅ toggleable.
> - **Roll cage = `Object_110` + `Object_256`** (material `CIVIC_CAGES`). ✅ toggleable.
> - **There are NO side skirts.** The other `CIVIC_CARBON_EXT` meshes (126/178/281) are
>   **interior door trim**, not skirts. Hiding by that material would gut the cabin —
>   which is exactly why `partGroups` keys on MESH names, not material names.
> - **There is NO separable rear wing.** The body is two fused `cuerpo` meshes
>   (`Object_861`, `Object_901`) that each span the whole car, so the decklid wing is
>   baked into the shell — hiding it means hiding the car. A wing needs an **M3 swap**
>   (a separate part GLB), not an M2 toggle. Don't go hunting for a wing mesh again.
>
> In a teardown the wing and side sills therefore lift away *with the body*, because
> they are part of it. That is correct behaviour, not a missing feature.

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

    // M2/M3: logical parts → the MESH names that compose them.
    // Used to (a) toggle visibility and (b) hide the stock part before a swap.
    // ⚠️ AS SHIPPED this keys on MESH names, not the material names sketched here —
    // one material spans several parts, so material matching hides too much (§3).
    partGroups: {
      splitter: ["Object_36"],                 // shipped
      cage:     ["Object_110", "Object_256"],  // shipped
      // wheels: [...] — NOT shipped; the wheel meshes are a fused set on this GLB.
      // spoiler: — impossible on this model, the wing is fused into the body (§3).
    },

    // The rail's on/off list, in display order. Shipped alongside partGroups.
    mods: [
      { id: "splitter", label: "Carbon front splitter", sub: "front lip", on: true },
      { id: "cage",     label: "Bolt-in roll cage",     sub: "cabin",     on: true },
    ],

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

## 7. Click parts on the car — ✅ BUILT 2026-08-24

Shipped in `TeardownStage.jsx`, reusing the raycast group that teardown picking
already had — **one raycast, three meanings**, resolved so the gestures never
compete:

| Mode | Target under the pointer | A tap means |
|---|---|---|
| Torn down | any part | select it → info card (unchanged) |
| Showroom | a **bolt-on** (`partGroups`) | take it **off the car** |
| Showroom | any other **breakdown part** | **pop just that part out** + info card |

**Solo pop-out** is the headline: clicking the wheels lifts *only* the wheels off the
car and opens their card, instead of the all-or-nothing TEARDOWN. It is not a second
animation — it sets that one part's `anim.target = 1`, the exact per-part tween the
full teardown drives, so a solo part travels the same path to the same place it would
occupy in a full teardown. Precedence: a bolt-on wins over the part it sits on, since
it is the more specific target and is *inside* another part's mesh set (the splitter
belongs to the body), so it could never be hit otherwise.

The camera aims at where a solo part **settles** (`anchor + anchorDir × EXPLODE_DIST`),
not where it starts — when this effect runs the part hasn't moved yet, so framing its
current bounds would let it sail out of shot.

Exit is ESC, the card's ✕, or clicking empty space (`onPointerMissed`).

### What is NOT clickable from the showroom

Picking uses the closest hit, so a part only responds if it is the outermost thing
under the cursor. Three consequences, all inherent to the models rather than the code:

- **Procedural internals** (engine / drivetrain / suspension on most cars) are hidden
  at rest — the frame loop only materialises them once `a.t > 0.02` — so there is
  nothing to hover. TEARDOWN remains the way in.
- **Occluded parts**: brakes sit behind wheels, interior behind glass. Pop the outer
  part first and the one beneath becomes the closest hit — the car peels layer by
  layer, which is the intended way to reach them.
- **Coverage is what each GLB separates into**, so it ranges from 2 clickable parts on
  the palette-merged Miata/E46 up to 4 on the FC3. See §3.

How it works, and the three things worth knowing before touching it:

1. **Meshes are tagged, not matched at pick time.** Resolving `partGroups` stamps
   `mesh.userData.modSlot`, mirroring the `userData.partId` teardown picking already
   uses. A hit maps straight back to its mod.
2. **It searches ALL intersections, not the closest hit.** The roll cage sits behind
   the window glass, so a closest-hit test lands on the glass and can never reach it.
   Only meshes carrying a `modSlot` qualify, so this stays targeted. Three's raycaster
   skips invisible meshes, so a removed part cannot be re-hit.
3. **Hovered mods get their own cloned material.** These materials are shared —
   `CIVIC_CARBON_EXT` is the splitter *and* the interior door trim — so boosting the
   shared one would light half the cabin. The clone happens after `recs`/`paintMats`
   resolve and keeps `.name`, so explode grouping and paint are unaffected.

A removed part leaves no geometry to click, so **the way back** is a "put back" chip
over the stage, or the MODS checkbox in the rail. Hover feedback is an accent emissive
glow + a `pointer` cursor + the stage caption swapping to "Click to remove · <part>".

**Not yet covered:** `CarModel.jsx` (the stage used by cars *without* a breakdown)
honours the toggles but has no picking. No car is in that position today — the only
car with `partGroups` is the FC3, which renders on `TeardownStage` — so it would be
dead code. Add it there if a mod car ever ships without a breakdown.

Still true as an aspiration: this **replaces the abstract hotspot spheres with
real-geometry selection**, so the mechanical-breakdown hotspots (8.4) and mod
selection share one raycast foundation.

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

1. ✅ **M1 paint on the FC3** — swatches → `cuerpo`. Built the config→3D bridge.
   Since extended to all 7 launch cars with a paintable body material.
2. ✅ **M2 toggles on the FC3** — splitter + roll cage on-off (⚠️ *not* spoiler, §3).
   First real "mod."
3. ✅ **Click parts on the car** (§7) — pulled forward ahead of M3, since it needs no
   assets: click-to-remove for bolt-ons, and solo pop-out + info card for any
   breakdown part, on all 8 cars that have a 3D model.
4. **M3 rims on the FC3** — hub anchors + 2–3 rim GLBs. First true swap. ← NEXT
5. **Generalize**: rims across the other hero cars (measure each car's hubs), and
   audit each GLB for M2-able meshes (FL5 at 28 meshes and the GT-R are the best
   candidates; the Miata and E46 are palette-merged and have almost nothing to give).
6. **Body parts** (spoilers, then bumpers/fenders) — per-car libraries. This is the
   only route to a rear wing on the FC3.

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
