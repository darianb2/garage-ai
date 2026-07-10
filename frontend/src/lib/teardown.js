// Teardown constants + pure helpers, ported from the design handoff's reference
// viewer. The 3D component (components/teardown/TeardownStage.jsx) owns the live
// refs + animation loop; the tuned numbers, easing, choreography, spec formatting,
// and the camera-tween target math (the part that "took tuning — copy exactly")
// live here so the component stays about React wiring, not magic constants.
//
// Deliberately three-free: ShowroomMode imports carSpecChips from here, so pulling
// in `three` would drag the whole 3D engine into the main bundle. computeTween
// only calls methods on the Vector3s it's handed; partFrame (which constructs
// three objects) lives in TeardownStage instead.

export const ACCENT = 0x5a8cf0;
export const EXPLODE_DIST = 1.02; // world (fitted) units of travel at explodeAmount = 1
export const EXPLODE_AMOUNT = 1.2; // user-approved default multiplier
export const CALLOUT_DRIFT = 0.62; // fraction of the explode a non-modeled callout drifts
export const ENTER_MS = 900; // per-part explode duration
export const EXIT_MS = 620; // reassemble duration (no stagger)
export const CAM_MS = 850; // camera glide duration

// Per-part start delays for the explode, keyed off the part's `system`. Default
// choreography (user-approved): body first, then a cascade of waves outward.
// Wheels carry system:"suspension" → wave 3. Anything unmapped falls to wave 2.
export const WAVE_BY_SYSTEM = { body: 0, safety: 1, electrical: 1, engine: 2, drivetrain: 2, suspension: 3, brakes: 3 };
export const WAVE_MS = 240;

// Stand-ins that would otherwise land inside the lifted body shell travel less far.
export const PROC_EXPLODE_SCALE = { engine: 0.55 };

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Spec strip (car_specs header): fixed order + labels, horsepower gets a "hp" unit.
const SPEC_LABELS = [
  ["engine", "ENGINE"],
  ["horsepower", "POWER"],
  ["torque", "TORQUE"],
  ["transmission", "GEARBOX"],
  ["drivetrain", "DRIVE"],
  ["0_to_60", "0–60 MPH"],
  ["curb_weight", "WEIGHT"],
  ["fuel_economy", "ECONOMY"],
];
export function carSpecChips(carSpecs) {
  if (!carSpecs) return [];
  return SPEC_LABELS.filter(([k]) => carSpecs[k] != null).map(([k, label]) => ({
    k: label,
    v: k === "horsepower" ? `${carSpecs[k]} hp` : String(carSpecs[k]),
  }));
}

// Which side of its dot a marker's label sits on, to reduce collisions. The FC3's
// anchors put several parts close together up front, so the sides are pinned to
// pull neighbours apart (engine↔suspension, suspension↔brakes) rather than left to
// index parity; anything unpinned alternates by index.
export function labelSide(id, idx) {
  const fixed = { engine: "right", suspension: "left", brakes: "right", electrical: "left", body: "left", interior: "right" };
  return fixed[id] || (idx % 2 === 0 ? "right" : "left");
}

// Compute the camera + orbit-target destination that frames a part. Mirrors the
// reference tweenCamera(): when `elev` is given we pin the viewing elevation, pick
// an azimuth that clears the car (approach from the part's own side when it sits
// off-axis), and bias the framing screen-right + down so the floating info card
// gets clear space and the part never sits bottom-cut. Returns { p, t } world
// vectors for camera.position and controls.target. Pure given the inputs.
export function computeTween(camPos, ctrlTarget, targetV, dist, elev) {
  const from = { p: camPos.clone(), t: ctrlTarget.clone() };
  const dir = camPos.clone().sub(targetV);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0.5, -1);
  dir.normalize();
  const to = { p: targetV.clone().addScaledVector(dir, dist), t: targetV.clone() };

  if (elev != null) {
    to.p.y = to.t.y + dist * elev;
    const hx = to.p.x - to.t.x;
    const hz = to.p.z - to.t.z;
    const hLen = Math.sqrt(hx * hx + hz * hz) || 1;
    const hNeed = Math.sqrt(Math.max(dist * dist - (dist * elev) * (dist * elev), 0.04));
    const hd = Math.sqrt(to.t.x * to.t.x + to.t.z * to.t.z);
    if (hd > 0.5) {
      // part sits outward from the car — approach from its own side so the car doesn't occlude it
      to.p.x = to.t.x + (to.t.x / hd) * hNeed;
      to.p.z = to.t.z + (to.t.z / hd) * hNeed;
    } else {
      to.p.x = to.t.x + (hx / hLen) * hNeed;
      to.p.z = to.t.z + (hz / hLen) * hNeed;
    }
    // bias the part left-of-center so the floating card gets clear space
    const vx = to.t.x - to.p.x;
    const vz = to.t.z - to.p.z;
    const vLen = Math.sqrt(vx * vx + vz * vz) || 1;
    const rx = -vz / vLen; // screen-right (viewDir × up, horizontal)
    const rz = vx / vLen;
    const s = dist * 0.09;
    to.t.x += rx * s;
    to.t.z += rz * s;
    to.p.x += rx * s;
    to.p.z += rz * s;
    // slight upward screen bias so the part never sits bottom-cut
    const s2 = dist * 0.045;
    to.t.y -= s2;
    to.p.y -= s2;
  } else if (to.p.y < 0.3) {
    to.p.y = 0.3;
  }
  return { from, to };
}
