/* procedural-parts.js — procedural stand-ins for the FC3's un-modeled internals.
 * Pure three.js primitives, no external assets. Fitted units (1 unit ≈ 1.31 m),
 * origin-centered, +X = nose, +Y = up, +Z = left. Low/mid poly (< ~15k tris total).
 *
 * The downloaded FC3 GLB only carries the car's OUTER parts (body, wheels, brakes,
 * lights, glass, interior); its engine/transaxle/suspension were never modeled, so
 * the Teardown builds them from primitives here. Shipped nearly verbatim from the
 * design handoff — this file is the one piece the handoff marked "portable".
 *
 * Portable contract: buildPart(THREE, id, variant?) → { group, meshes, materials, size, anchorOffset }
 *   variant selects engine layout / drive type — engine: i6|v6|i4l (default transverse-4);
 *   drivetrain: rwd|awd (default FWD transaxle). Lets each car drop a correctly-shaped chassis.
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

/* -------- longitudinal inline-6 (crank along X): Supra 2JZ / M3 S54 ---------- */
function buildEngineI6(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // tall block stacked in Y, long in X (nose→tail): pan → block → head → cam cover
  g.add(L.box(0.60, 0.09, 0.24, L.aluDark, 0, -0.20, 0));
  g.add(L.box(0.62, 0.20, 0.30, L.alu, 0, -0.06, 0));
  g.add(L.box(0.60, 0.09, 0.28, L.alu, 0, 0.07, 0));
  g.add(L.box(0.58, 0.06, 0.24, L.plastic, 0, 0.145, 0));
  // 6 coil packs on top, in a row along X (cobalt tips)
  for (let i = 0; i < 6; i++) {
    const x = -0.25 + i * 0.10;
    g.add(L.cyl(0.015, 0.015, 0.03, L.plastic, x, 0.185, -0.02));
    g.add(L.cyl(0.016, 0.016, 0.01, L.accent, x, 0.205, -0.02));
  }
  // intake plenum + 6 runners down the +Z (left) side
  g.add(L.cyl(0.048, 0.048, 0.56, L.plastic, 0, 0.10, 0.18, 'x'));
  for (let j = 0; j < 6; j++) {
    const x = -0.25 + j * 0.10;
    const run = L.cyl(0.016, 0.016, 0.12, L.plastic, x, 0.075, 0.13);
    run.rotation.x = 0.85;
    g.add(run);
  }
  // exhaust manifold down the −Z (right) side + a single turbo snail at the tail
  for (let k = 0; k < 6; k++) {
    const x = -0.25 + k * 0.10;
    const ex = L.cyl(0.014, 0.014, 0.09, L.iron, x, 0.0, -0.14);
    ex.rotation.x = -1.0;
    g.add(ex);
  }
  g.add(L.box(0.5, 0.05, 0.05, L.iron, 0, -0.045, -0.19));
  const snail = L.tor(0.04, 0.022, 5.0, L.iron, -0.30, -0.11, -0.17); snail.rotation.x = Math.PI / 2; g.add(snail);
  g.add(L.cyl(0.024, 0.024, 0.06, L.alu, -0.33, -0.08, -0.14, 'x'));
  // accessory belt at the nose (+X): crank pulley, alternator, belt loop
  g.add(L.cyl(0.05, 0.05, 0.026, L.steel, 0.31, -0.10, 0, 'x'));
  g.add(L.cyl(0.028, 0.028, 0.02, L.steel, 0.315, 0.03, 0.06, 'x'));
  g.add(L.cyl(0.04, 0.04, 0.06, L.aluDark, 0.30, 0.0, -0.09, 'x'));
  const belt = L.tor(0.09, 0.006, Math.PI * 2, L.rubber, 0.315, -0.03, 0); belt.rotation.y = Math.PI / 2; belt.scale.set(1, 1.3, 1); g.add(belt);
  return finish(THREE, g, L, [0.66, 0.46, 0.5], [0.05, 0.2, 0]);
}

/* -------- longitudinal V6 (two banks in a vee): GT-R VR38DETT --------------- */
function buildEngineV6(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // crankcase + lower vee
  g.add(L.box(0.36, 0.10, 0.34, L.aluDark, 0, -0.16, 0));
  g.add(L.box(0.32, 0.14, 0.30, L.alu, 0, -0.05, 0));
  [1, -1].forEach((s) => {
    // cylinder bank + cam cover, tilted into the vee
    const bank = L.box(0.32, 0.16, 0.12, L.alu, 0, 0.07, s * 0.12); bank.rotation.x = s * 0.5; g.add(bank);
    const cover = L.box(0.30, 0.05, 0.10, L.plastic, 0, 0.15, s * 0.15); cover.rotation.x = s * 0.5; g.add(cover);
    for (let i = 0; i < 3; i++) {
      const x = -0.10 + i * 0.10;
      const c = L.cyl(0.014, 0.014, 0.03, L.accent, x, 0.17, s * 0.17); c.rotation.x = s * 0.5; g.add(c);
    }
    // low-mounted turbo snail per bank
    const snail = L.tor(0.036, 0.02, 5.0, L.iron, 0.0, -0.12, s * 0.24); snail.rotation.y = Math.PI / 2; g.add(snail);
    g.add(L.cyl(0.02, 0.02, 0.05, L.copper, 0.04, -0.12, s * 0.24, 'x'));
  });
  // intake plenum in the valley + throttle at the nose
  g.add(L.box(0.26, 0.06, 0.16, L.plastic, 0, 0.13, 0));
  g.add(L.cyl(0.03, 0.03, 0.05, L.alu, 0.18, 0.13, 0, 'x'));
  // accessory pulley at the nose
  g.add(L.cyl(0.05, 0.05, 0.026, L.steel, 0.20, -0.08, 0, 'x'));
  return finish(THREE, g, L, [0.46, 0.46, 0.52], [0.05, 0.2, 0]);
}

/* -------- longitudinal naturally-aspirated inline-4: Miata Skyactiv --------- */
function buildEngineI4Long(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  g.add(L.box(0.40, 0.09, 0.24, L.aluDark, 0, -0.17, 0));
  g.add(L.box(0.42, 0.18, 0.28, L.alu, 0, -0.05, 0));
  g.add(L.box(0.40, 0.08, 0.26, L.alu, 0, 0.06, 0));
  g.add(L.box(0.38, 0.05, 0.22, L.plastic, 0, 0.12, 0));
  for (let i = 0; i < 4; i++) { const x = -0.15 + i * 0.10; g.add(L.cyl(0.014, 0.014, 0.026, L.accent, x, 0.15, -0.02)); }
  // intake (+Z) + tubular exhaust header (−Z), no turbo
  g.add(L.cyl(0.04, 0.04, 0.36, L.plastic, 0, 0.08, 0.16, 'x'));
  for (let j = 0; j < 4; j++) { const x = -0.15 + j * 0.10; const r = L.cyl(0.014, 0.014, 0.10, L.plastic, x, 0.06, 0.12); r.rotation.x = 0.8; g.add(r); }
  for (let k = 0; k < 4; k++) { const x = -0.15 + k * 0.10; const e = L.cyl(0.013, 0.013, 0.09, L.iron, x, -0.02, -0.14); e.rotation.x = -0.9; g.add(e); }
  g.add(L.box(0.34, 0.04, 0.04, L.iron, 0, -0.06, -0.18));
  g.add(L.cyl(0.045, 0.045, 0.024, L.steel, 0.21, -0.09, 0, 'x'));
  return finish(THREE, g, L, [0.46, 0.42, 0.42], [0.05, 0.2, 0]);
}

/* -------- RWD gearbox + prop shaft + rear diff (along X): Supra/M3/Miata ---- */
function buildGearboxRWD(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // gearbox at the front (+X): bell housing → tapered case → main case + shifter
  g.add(L.cyl(0.10, 0.10, 0.02, L.aluDark, 0.34, 0, 0, 'x', 22));
  g.add(L.cyl(0.075, 0.10, 0.14, L.alu, 0.25, 0, 0, 'x', 22));
  g.add(L.cyl(0.06, 0.06, 0.18, L.alu, 0.09, 0, 0, 'x', 20));
  g.add(L.box(0.04, 0.05, 0.05, L.aluDark, 0.05, 0.09, 0));
  g.add(L.cyl(0.008, 0.008, 0.05, L.steel, 0.05, 0.12, 0));
  // prop shaft to the rear (−X) with U-joints
  g.add(L.cyl(0.018, 0.018, 0.5, L.steel, -0.18, 0, 0, 'x'));
  g.add(L.sph(0.03, L.steel, 0.02, 0, 0));
  g.add(L.sph(0.03, L.steel, -0.42, 0, 0));
  // rear diff (pumpkin) + half-shafts out to the wheels (±Z)
  const pk = L.sph(0.075, L.iron, -0.48, -0.02, 0); pk.scale.set(0.9, 1, 1); g.add(pk);
  g.add(L.cyl(0.06, 0.06, 0.10, L.iron, -0.48, -0.02, 0, 'x', 16));
  g.add(L.tor(0.06, 0.006, Math.PI * 2, L.accent, -0.44, -0.02, 0));
  [1, -1].forEach((s) => {
    g.add(L.cyl(0.014, 0.014, 0.28, L.steel, -0.48, -0.02, s * 0.20, 'z'));
    g.add(L.cyl(0.022, 0.026, 0.04, L.rubber, -0.48, -0.02, s * 0.09, 'z'));
    g.add(L.sph(0.026, L.steel, -0.48, -0.02, s * 0.34));
  });
  return finish(THREE, g, L, [1.0, 0.22, 0.5], [0.28, 0.14, 0]);
}

/* -------- AWD: front transfer → carbon prop shaft → rear transaxle: GT-R ---- */
function buildTransaxleAWD(THREE) {
  const L = makeLib(THREE);
  const g = new THREE.Group();
  // front transfer case (+X)
  g.add(L.cyl(0.055, 0.055, 0.10, L.alu, 0.36, 0, 0.04, 'x', 18));
  // carbon prop shaft to the rear
  g.add(L.cyl(0.02, 0.02, 0.58, L.iron, 0.0, 0, 0, 'x'));
  g.add(L.sph(0.03, L.steel, 0.28, 0, 0));
  g.add(L.sph(0.03, L.steel, -0.30, 0, 0));
  // rear transaxle (−X): clutch bell + case + final drive with cobalt ring
  g.add(L.cyl(0.11, 0.11, 0.06, L.aluDark, -0.30, 0, 0, 'x', 22));
  g.add(L.box(0.22, 0.19, 0.28, L.alu, -0.43, -0.01, 0));
  g.add(L.cyl(0.05, 0.05, 0.04, L.aluDark, -0.43, -0.10, 0.13, 'x'));
  g.add(L.tor(0.05, 0.006, Math.PI * 2, L.accent, -0.41, -0.10, 0.13));
  [1, -1].forEach((s) => {
    g.add(L.cyl(0.015, 0.015, 0.26, L.steel, -0.43, -0.05, s * 0.24, 'z'));
    g.add(L.cyl(0.024, 0.028, 0.04, L.rubber, -0.43, -0.05, s * 0.11, 'z'));
    g.add(L.sph(0.03, L.steel, -0.43, -0.05, s * 0.30));
  });
  return finish(THREE, g, L, [1.0, 0.26, 0.56], [0.30, 0.16, 0]);
}

// id → assembly, with an optional `variant` for engine layout / drive type. The
// Hondas (FWD transverse-4) use the defaults; the RWD/AWD cars pass a variant so
// the stand-in that drops out actually matches the car (inline-6, V6, RWD gearbox…).
export function buildPart(THREE, id, variant) {
  if (id === 'engine') {
    if (variant === 'i6') return buildEngineI6(THREE);
    if (variant === 'v6') return buildEngineV6(THREE);
    if (variant === 'i4l') return buildEngineI4Long(THREE);
    return buildEngine(THREE); // transverse turbo-4 (FC3/FG4/FL5)
  }
  if (id === 'drivetrain') {
    if (variant === 'rwd') return buildGearboxRWD(THREE);
    if (variant === 'awd') return buildTransaxleAWD(THREE);
    return buildTransaxle(THREE); // FWD transaxle (Hondas)
  }
  if (id === 'suspension') return buildSuspensionSet(THREE);
  return null;
}
