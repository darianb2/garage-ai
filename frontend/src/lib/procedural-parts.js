/* procedural-parts.js — procedural stand-ins for the FC3's un-modeled internals.
 * Pure three.js primitives, no external assets. Fitted units (1 unit ≈ 1.31 m),
 * origin-centered, +X = nose, +Y = up, +Z = left. Low/mid poly (< ~15k tris total).
 *
 * The downloaded FC3 GLB only carries the car's OUTER parts (body, wheels, brakes,
 * lights, glass, interior); its engine/transaxle/suspension were never modeled, so
 * the Teardown builds them from primitives here. Shipped nearly verbatim from the
 * design handoff — this file is the one piece the handoff marked "portable".
 *
 * Portable contract: buildPart(THREE, id) → { group, meshes, materials, size, anchorOffset }
 *   group        Object3D, origin-centered assembly
 *   meshes       flat mesh list (raycast targets; userData.partId is set by the host)
 *   materials    unique materials (each carries userData.base for emissive restore)
 *   size         Vector3 bounding size
 *   anchorOffset vector from group origin to the point the API anchor refers to
 *                (place at: anchor − anchorOffset)
 * In R3F, wrap with <primitive object={buildPart(THREE,'engine').group} />.
 */

const ACCENT = 0x5a8cf0;

function makeLib(THREE) {
  const materials = [];
  function std(color, metalness, roughness) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    m.userData.base = { emissive: m.emissive.getHex(), emissiveIntensity: m.emissiveIntensity, color: m.color.getHex() };
    materials.push(m);
    return m;
  }
  const lib = {
    materials,
    alu: std(0x9aa0a8, 0.9, 0.5),
    aluDark: std(0x71767d, 0.85, 0.55),
    iron: std(0x3a3d41, 0.7, 0.65),
    plastic: std(0x1e1f22, 0.15, 0.85),
    steel: std(0xc9cdd3, 1.0, 0.32),
    copper: std(0xa8703d, 1.0, 0.42),
    rubber: std(0x191a1c, 0.05, 0.92),
    accent: std(ACCENT, 0.55, 0.45),
  };
  lib.box = function (w, h, d, mat, x, y, z, ry) {
    const ms = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    ms.position.set(x || 0, y || 0, z || 0);
    if (ry) ms.rotation.y = ry;
    return ms;
  };
  // axis: 'y' (default) | 'z' | 'x'
  lib.cyl = function (rTop, rBot, h, mat, x, y, z, axis, seg) {
    const ms = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg || 18), mat);
    if (axis === 'z') ms.rotation.x = Math.PI / 2;
    if (axis === 'x') ms.rotation.z = Math.PI / 2;
    ms.position.set(x || 0, y || 0, z || 0);
    return ms;
  };
  lib.sph = function (r, mat, x, y, z) {
    const ms = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    ms.position.set(x || 0, y || 0, z || 0);
    return ms;
  };
  lib.tor = function (r, tube, arc, mat, x, y, z) {
    const ms = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20, arc || Math.PI * 2), mat);
    ms.position.set(x || 0, y || 0, z || 0);
    return ms;
  };
  // vertical coil spring centered at origin
  lib.spring = function (r, h, turns, tube, mat, x, y, z) {
    const pts = [];
    const N = Math.round(turns * 12);
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, (i / N) * h - h / 2, Math.sin(a) * r));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, tube, 6, false);
    const ms = new THREE.Mesh(geo, mat);
    ms.position.set(x || 0, y || 0, z || 0);
    return ms;
  };
  return lib;
}

function finish(THREE, group, lib, size, anchorOffset) {
  const meshes = [];
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      meshes.push(o);
    }
  });
  return {
    group,
    meshes,
    materials: lib.materials,
    size: new THREE.Vector3(size[0], size[1], size[2]),
    anchorOffset: new THREE.Vector3(anchorOffset[0], anchorOffset[1], anchorOffset[2]),
  };
}

/* ---------------- 1.5L L15B7 turbo inline-4, transverse (crank along Z) ------ */
function buildEngine(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // core stack: pan → block → head → cam cover
  g.add(L.box(0.24, 0.09, 0.34, L.aluDark, 0, -0.20, 0));
  g.add(L.box(0.30, 0.18, 0.46, L.alu, 0, -0.065, 0));
  g.add(L.box(0.28, 0.09, 0.44, L.alu, 0, 0.07, 0));
  g.add(L.box(0.24, 0.06, 0.42, L.plastic, 0, 0.145, 0));
  // filler cap + 4 coil packs (cobalt tips)
  g.add(L.cyl(0.022, 0.022, 0.018, L.plastic, 0.07, 0.183, -0.16));
  for (let i = 0; i < 4; i++) {
    const z = -0.14 + i * 0.093;
    g.add(L.cyl(0.015, 0.015, 0.03, L.plastic, -0.03, 0.185, z));
    g.add(L.cyl(0.016, 0.016, 0.01, L.accent, -0.03, 0.203, z));
  }
  // intake side (+X, toward the nose): plenum + 4 angled runners + throttle body
  g.add(L.cyl(0.048, 0.048, 0.34, L.plastic, 0.20, 0.10, 0, 'z'));
  for (let j = 0; j < 4; j++) {
    const zr = -0.14 + j * 0.093;
    const run = L.cyl(0.016, 0.016, 0.13, L.plastic, 0.165, 0.075, zr);
    run.rotation.z = -0.85;
    g.add(run);
  }
  g.add(L.cyl(0.03, 0.03, 0.05, L.alu, 0.20, 0.10, 0.19, 'z'));
  // exhaust side (−X): 4 primaries into a collector, low
  for (let k = 0; k < 4; k++) {
    const ze = -0.14 + k * 0.093;
    const ex = L.cyl(0.016, 0.016, 0.10, L.iron, -0.165, 0.0, ze);
    ex.rotation.z = 1.0;
    g.add(ex);
  }
  g.add(L.box(0.05, 0.06, 0.30, L.iron, -0.20, -0.045, 0));
  // turbocharger: iron turbine snail + alu compressor snail + cartridge + downpipe
  const snailT = L.tor(0.042, 0.024, 5.0, L.iron, -0.225, -0.10, 0.05); snailT.rotation.y = Math.PI / 2; g.add(snailT);
  g.add(L.cyl(0.02, 0.02, 0.06, L.copper, -0.225, -0.10, 0.085, 'z'));
  const snailC = L.tor(0.037, 0.02, 5.2, L.alu, -0.225, -0.10, 0.125); snailC.rotation.y = Math.PI / 2; g.add(snailC);
  g.add(L.cyl(0.024, 0.024, 0.07, L.alu, -0.20, -0.075, 0.165, 'z'));
  const dp = L.cyl(0.026, 0.03, 0.10, L.iron, -0.24, -0.165, 0.02); dp.rotation.z = 0.5; g.add(dp);
  // accessory end (−Z): crank pulley, alternator, belt loop
  g.add(L.cyl(0.05, 0.05, 0.028, L.steel, 0, -0.12, -0.255, 'z'));
  g.add(L.cyl(0.028, 0.028, 0.02, L.steel, 0.045, 0.05, -0.252, 'z'));
  g.add(L.cyl(0.042, 0.042, 0.07, L.aluDark, 0.145, 0.01, -0.24, 'z'));
  const belt = L.tor(0.095, 0.006, Math.PI * 2, L.rubber, 0.06, -0.04, -0.256);
  belt.scale.set(1, 1.35, 1); g.add(belt);
  // mount bracket (+Z end)
  g.add(L.box(0.10, 0.05, 0.03, L.alu, 0, 0.02, 0.245));
  return finish(THREE, g, L, [0.52, 0.46, 0.55], [0.12, 0.2, 0]);
}

/* ------------- 6-speed manual transaxle + helical LSD + CV axles (along Z) --- */
function buildTransaxle(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // clutch bell housing (mates the engine at +Z) → case → end cover
  g.add(L.cyl(0.145, 0.145, 0.02, L.aluDark, 0, 0, 0.20, 'z', 24));
  g.add(L.cyl(0.13, 0.145, 0.10, L.alu, 0, 0, 0.14, 'z', 24));
  g.add(L.cyl(0.105, 0.088, 0.26, L.alu, 0, 0, -0.04, 'z', 22));
  const cap = L.sph(0.088, L.alu, 0, 0, -0.17); cap.scale.set(1, 1, 0.55); g.add(cap);
  // case ribs
  for (let i = 0; i < 4; i++) {
    g.add(L.box(0.012, 0.19, 0.22, L.aluDark, Math.cos(i * 0.9 + 0.4) * 0.09, Math.sin(i * 0.9 + 0.4) * 0.09, -0.03, 0));
  }
  // final drive / helical LSD hump with cobalt ring
  g.add(L.cyl(0.085, 0.085, 0.10, L.alu, 0.10, -0.075, 0.055, 'z', 20));
  g.add(L.cyl(0.06, 0.06, 0.02, L.aluDark, 0.10, -0.075, 0.115, 'z', 20));
  g.add(L.tor(0.086, 0.006, Math.PI * 2, L.accent, 0.10, -0.075, 0.107));
  // shift tower + cable ends
  g.add(L.box(0.05, 0.03, 0.06, L.aluDark, -0.02, 0.115, -0.02));
  g.add(L.cyl(0.008, 0.008, 0.05, L.steel, -0.02, 0.15, -0.02));
  g.add(L.cyl(0.006, 0.006, 0.09, L.rubber, -0.06, 0.125, 0.04, 'z'));
  g.add(L.cyl(0.006, 0.006, 0.09, L.rubber, 0.02, 0.125, 0.05, 'z'));
  // CV axles (±Z toward the front wheels): shaft, boots, CV joint balls
  [1, -1].forEach((s) => {
    g.add(L.cyl(0.015, 0.015, 0.40, L.steel, 0.10, -0.075, s * 0.33, 'z'));
    g.add(L.cyl(0.026, 0.032, 0.045, L.rubber, 0.10, -0.075, s * 0.16, 'z'));
    g.add(L.cyl(0.032, 0.026, 0.045, L.rubber, 0.10, -0.075, s * 0.46, 'z'));
    g.add(L.sph(0.034, L.steel, 0.10, -0.075, s * 0.52));
    g.add(L.cyl(0.02, 0.02, 0.04, L.steel, 0.10, -0.075, s * 0.555, 'z'));
  });
  return finish(THREE, g, L, [0.36, 0.32, 1.15], [0, 0.14, 0]);
}

/* -- suspension set: MacPherson front pair + multi-link rear pair on subframes -
 * Component x spans the wheelbase (front corners at x≈+1.03, rear at x≈−1.03),
 * struts at z ±0.58, y 0 ≈ wheel-center height. anchorOffset = front-left strut top. */
function buildSuspensionSet(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  const FX = 1.03, RX = -1.03, TZ = 0.58;

  // front subframe + sway bar
  g.add(L.box(0.28, 0.03, 0.86, L.iron, FX - 0.06, -0.11, 0));
  g.add(L.cyl(0.011, 0.011, 0.92, L.iron, FX - 0.14, -0.045, 0, 'z'));

  [1, -1].forEach((s) => {
    const z = TZ * s;
    // MacPherson strut: damper body, rod, cobalt coil, top mount + ADS actuator
    g.add(L.cyl(0.022, 0.022, 0.20, L.plastic, FX, -0.02, z));
    g.add(L.cyl(0.009, 0.009, 0.13, L.steel, FX, 0.135, z));
    g.add(L.spring(0.05, 0.2, 4.5, 0.009, L.accent, FX, 0.05, z));
    g.add(L.cyl(0.045, 0.045, 0.024, L.plastic, FX, 0.225, z));
    g.add(L.box(0.028, 0.022, 0.028, L.accent, FX + 0.03, 0.245, z));
    // knuckle + hub
    g.add(L.box(0.03, 0.10, 0.035, L.steel, FX, -0.09, z));
    g.add(L.cyl(0.05, 0.05, 0.028, L.steel, FX, -0.115, z + s * 0.03, 'z', 16));
    // L-shaped lower control arm (inboard + trailing legs) + ball joint
    const a1 = L.box(0.035, 0.016, 0.24, L.iron, FX - 0.01, -0.13, z - s * 0.12);
    g.add(a1);
    const a2 = L.box(0.16, 0.016, 0.035, L.iron, FX - 0.09, -0.13, z - s * 0.05, s * 0.35);
    g.add(a2);
    g.add(L.sph(0.018, L.steel, FX, -0.125, z));
    // sway-bar end link
    g.add(L.cyl(0.006, 0.006, 0.09, L.steel, FX - 0.14, -0.005, z - s * 0.06));
  });

  // rear subframe + crossmember
  g.add(L.box(0.26, 0.035, 0.8, L.iron, RX + 0.04, -0.09, 0));
  g.add(L.box(0.4, 0.02, 0.05, L.iron, RX + 0.13, -0.075, 0));

  [1, -1].forEach((s) => {
    const z = (TZ - 0.04) * s;
    // coil-over (slightly inclined) with cobalt spring
    const dam = L.cyl(0.02, 0.02, 0.19, L.plastic, RX, 0.03, z - s * 0.04);
    dam.rotation.x = s * 0.18; g.add(dam);
    const spr = L.spring(0.045, 0.15, 4, 0.008, L.accent, RX, 0.045, z - s * 0.045);
    spr.rotation.x = s * 0.18; g.add(spr);
    g.add(L.cyl(0.035, 0.035, 0.02, L.plastic, RX, 0.135, z - s * 0.062));
    // hub + knuckle
    g.add(L.cyl(0.05, 0.05, 0.028, L.steel, RX, -0.08, z + s * 0.03, 'z', 16));
    g.add(L.box(0.03, 0.09, 0.03, L.steel, RX, -0.05, z));
    // multi-links: upper / lower / toe (lateral), trailing arm (longitudinal)
    g.add(L.box(0.02, 0.014, 0.30, L.iron, RX, 0.0, z - s * 0.16));
    g.add(L.box(0.024, 0.014, 0.36, L.iron, RX + 0.02, -0.095, z - s * 0.19));
    g.add(L.box(0.018, 0.012, 0.30, L.iron, RX - 0.07, -0.045, z - s * 0.16));
    g.add(L.box(0.24, 0.018, 0.03, L.iron, RX + 0.14, -0.06, z));
  });

  return finish(THREE, g, L, [2.5, 0.52, 1.4], [FX, 0.26, TZ]);
}

export function buildPart(THREE, id) {
  if (id === 'engine') return buildEngine(THREE);
  if (id === 'drivetrain') return buildTransaxle(THREE);
  if (id === 'suspension') return buildSuspensionSet(THREE);
  return null;
}
