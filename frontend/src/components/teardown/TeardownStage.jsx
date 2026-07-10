import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { hasWebGL } from "../../lib/webgl";
import { buildPart } from "../../lib/procedural-parts";
import {
  ACCENT,
  EXPLODE_DIST,
  ENTER_MS,
  EXIT_MS,
  CAM_MS,
  WAVE_BY_SYSTEM,
  WAVE_MS,
  PROC_EXPLODE_SCALE,
  CALLOUT_DRIFT,
  easeInOut,
  clamp,
  labelSide,
  computeTween,
} from "../../lib/teardown";

// ── The Showroom "Teardown": the car breaks apart Honda-"Cog" style. This is the
//    design handoff's imperative prototype ported into the app's R3F stage — one
//    WebGL context, the useGLTF cache, the demand frameloop. It renders the
//    assembled car too (teardown=false), so ShowroomMode swaps its normal Viewer3D
//    for this whenever a breakdown loaded (all launch cars with a model — the 4
//    clean models get real part meshes; the palette-merged Miata/M3 degrade to a
//    real body + procedural/callout internals); the button toggles in place so
//    paint + camera persist across the transition.
//
//    Coordinate space matches the API contract: the model auto-fits to ~3.4 units
//    long, grounded y=0, +X nose / +Y up / +Z left. Anchors are post-fit, so a
//    hotspot placed at `anchor` sits correctly. Real meshes live under the
//    fit-scaled car, so we explode them in parent-local space (inverse world
//    matrix), which absorbs fit_scale + node rotations.

const ACCENT_CSS = "#5a8cf0";
const ENTER_S = ENTER_MS / 1000;
const EXIT_S = EXIT_MS / 1000;
const CAM_S = CAM_MS / 1000;

// Frame a part from its LIVE (exploded) bounds so the camera catches the whole
// thing — all four wheels, the full shell, the spread suspension. `objects` are
// the part's real meshes and/or its stand-in group. Returns { center, dist }.
const _box = new THREE.Box3();
const _tb = new THREE.Box3();
const _v = new THREE.Vector3();
function partFrame(objects, fallbackCenter, fallbackRadius) {
  if (objects && objects.length) {
    _box.makeEmpty();
    for (const o of objects) {
      _tb.setFromObject(o);
      if (!_tb.isEmpty()) _box.union(_tb);
    }
    if (!_box.isEmpty()) {
      const c = _box.getCenter(new THREE.Vector3());
      if (c.y < 0.2) c.y = 0.2;
      const r = clamp(_box.getSize(_v).length() / 2, 0.5, 2.8);
      return { center: c, dist: clamp(r * 3.0, 2.8, 7.0) };
    }
  }
  const c = fallbackCenter.clone();
  if (c.y < 0.2) c.y = 0.2;
  return { center: c, dist: clamp(fallbackRadius * 3.2, 3.0, 6.0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Studio environment: RoomEnvironment PMREM for soft reflections (matches the
// prototype's `envMapIntensity 0.9` look), disposed on unmount.
function StudioEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    return () => {
      scene.environment = null;
      env.texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Part-record builder: select each part's meshes by material-name substring (the
// same matching the paint feature uses; first match wins so parts don't overlap),
// collect unique materials for highlight, and build procedural stand-ins for the
// un-modeled internals. Per-mesh explode direction is resolved later (needs live
// world matrices). Returns records the scene renders + animates.
function buildRecords(carObject, parts) {
  const taken = new Set();
  const recs = [];
  parts.forEach((def, idx) => {
    const subs = (def.materials || []).map((s) => s.toLowerCase());
    const meshes = [];
    if (subs.length) {
      carObject.traverse((o) => {
        if (!o.isMesh || taken.has(o.uuid)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const hit = mats.some((m) => m && m.name && subs.some((s) => m.name.toLowerCase().includes(s)));
        if (hit) {
          meshes.push(o);
          taken.add(o.uuid);
        }
      });
    }
    const mats = [];
    const seen = new Set();
    meshes.forEach((m) => {
      m.userData.partId = def.id;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
        if (mat && !seen.has(mat.uuid)) {
          seen.add(mat.uuid);
          mats.push(mat);
        }
      });
    });

    const explode = new THREE.Vector3().fromArray(def.explode);
    const anchor = new THREE.Vector3().fromArray(def.anchor);
    const mirror = def.id === "wheels" || def.id === "brakes";
    const aDir = explode.clone();
    if (mirror) aDir.z = Math.abs(explode.z) * (anchor.z >= 0 ? 1 : -1);

    // Radius from the assembled bounds → a camera-framing fallback.
    let radius = 0.45;
    if (meshes.length) {
      const box = new THREE.Box3();
      const tb = new THREE.Box3();
      meshes.forEach((m) => {
        tb.setFromObject(m);
        if (!tb.isEmpty()) box.union(tb);
      });
      if (!box.isEmpty()) radius = clamp(box.getSize(new THREE.Vector3()).length() / 2, 0.3, 1.7);
    }

    // Procedural stand-in for un-modeled parts (engine / drivetrain / suspension).
    let proc = null;
    let procBase = null;
    if (!def.modeled) {
      const built = buildPart(THREE, def.id, def.variant);
      if (built) {
        built.group.traverse((o) => {
          if (o.isMesh) o.userData.partId = def.id;
        });
        built.group.visible = false; // stays hidden until the explode materializes it
        proc = built;
        procBase = anchor.clone().sub(built.anchorOffset);
        built.materials.forEach((m) => mats.push(m));
        radius = clamp(built.size.length() / 2, 0.3, 2.2);
      }
    }

    // How far the hotspot (and stand-in) drift outward: modeled/stand-in parts ride
    // the full explode; pure callouts drift a fraction. Engine stand-in travels less
    // (full travel would park it inside the lifted shell).
    const anchorDir = def.modeled || proc ? aDir.clone() : aDir.clone().multiplyScalar(CALLOUT_DRIFT);
    if (proc && PROC_EXPLODE_SCALE[def.id]) anchorDir.multiplyScalar(PROC_EXPLODE_SCALE[def.id]);

    recs.push({ def, idx, meshes, mats, anchor, explode, anchorDir, proc, procBase, radius, mirror });
  });
  return recs;
}

const waveDelayMs = (system) => (WAVE_BY_SYSTEM[system] ?? 2) * WAVE_MS;

// ─────────────────────────────────────────────────────────────────────────────
// One clickable marker (dot + pulse halo + numbered label). Hover/select state is
// driven by React so only the affected markers re-render.
function Marker({ rec, teardown, hovered, selected, onHover, onSelect }) {
  const { def, idx } = rec;
  const side = labelSide(def.id, idx);
  const on = hovered || selected;
  const isCallout = !def.modeled && !rec.proc;
  const delay = teardown ? waveDelayMs(def.system) + 200 : 0;

  const stop = (e) => e.stopPropagation();
  const enter = (e) => {
    e.stopPropagation();
    if (teardown) onHover(def.id);
  };
  const leave = (e) => {
    e.stopPropagation();
    if (teardown) onHover(null);
  };
  const click = (e) => {
    e.stopPropagation();
    if (teardown) onSelect(def.id);
  };

  return (
    <div
      style={{
        opacity: teardown ? 1 : 0,
        transition: "opacity .45s ease",
        transitionDelay: `${delay}ms`,
        pointerEvents: "none",
      }}
    >
      <div
        onPointerDown={stop}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onClick={click}
        style={{
          position: "relative",
          transform: "translate(-50%,-50%)",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          pointerEvents: teardown ? "auto" : "none",
          flexDirection: side === "left" ? "row-reverse" : "row",
        }}
      >
        <div
          className={selected ? undefined : "marble-pulse"}
          style={{
            position: "absolute",
            top: "50%",
            width: 26,
            height: 26,
            margin: "-13px 0 0 0",
            borderRadius: "50%",
            border: "1px solid rgba(90,140,240,.45)",
            pointerEvents: "none",
            display: selected ? "none" : "block",
            [side === "left" ? "right" : "left"]: -7,
          }}
        />
        <div
          style={
            isCallout
              ? {
                  width: 10,
                  height: 10,
                  flex: "none",
                  transform: "rotate(45deg)",
                  border: "1.5px dashed #9db8f2",
                  background: "rgba(13,13,15,.65)",
                  boxShadow: on ? "0 0 16px rgba(90,140,240,.85)" : "0 0 10px rgba(90,140,240,.3)",
                  transition: "border-color .2s, box-shadow .2s",
                }
              : {
                  width: 12,
                  height: 12,
                  flex: "none",
                  borderRadius: "50%",
                  border: `2px solid ${ACCENT_CSS}`,
                  background: "rgba(13,13,15,.65)",
                  boxShadow: on ? "0 0 16px rgba(90,140,240,.85)" : "0 0 10px rgba(90,140,240,.4)",
                  transition: "border-color .2s, box-shadow .2s",
                }
          }
        />
        {/* Collapsed = just the number chip (keeps the scene uncluttered); the
            part name is revealed only for the hovered/selected marker. */}
        <div
          style={{
            whiteSpace: "nowrap",
            font: "500 10px 'JetBrains Mono', monospace",
            letterSpacing: ".14em",
            color: on ? "#fafaf9" : "#a1a1aa",
            background: on ? "rgba(34,55,110,.6)" : "rgba(20,20,24,.82)",
            border: `1px solid ${on ? "rgba(90,140,240,.7)" : "rgba(255,255,255,.12)"}`,
            padding: on ? "4px 8px" : "3px 6px",
            borderRadius: 4,
            backdropFilter: "blur(6px)",
            transition: "border-color .2s, color .2s, background .2s",
            [side === "left" ? "marginRight" : "marginLeft"]: on ? 12 : 9,
          }}
        >
          <span style={{ color: on ? "#8fb0f5" : "#71717a", marginRight: on ? 6 : 0 }}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          {on ? def.id.toUpperCase() : ""}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating info card, anchored to the selected part. Content order + tokens match
// the design handoff exactly (system·index, label, stand-in badge, summary,
// detail, specs table, WATCH block).
function InfoCard({ part, idx, total, onClose }) {
  const specs = Object.entries(part.specs || {});
  return (
    <div
      style={{
        width: 324,
        maxHeight: "min(560px, 64vh)",
        overflow: "auto",
        background: "rgba(20,20,22,.93)",
        backdropFilter: "blur(14px)",
        border: "1px solid #2a2a30",
        borderRadius: 10,
        boxShadow: "0 20px 50px rgba(0,0,0,.55)",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ font: "600 9.5px 'JetBrains Mono', monospace", letterSpacing: ".18em", color: ACCENT_CSS }}>
            {String(part.system).toUpperCase()} · {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 22,
              height: 22,
              border: "none",
              background: "transparent",
              color: "#71717a",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fafaf9", marginTop: 7, lineHeight: 1.3 }}>{part.label}</div>
        {!part.modeled && (
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              font: "500 8.5px 'JetBrains Mono', monospace",
              letterSpacing: ".14em",
              color: "#9db8f2",
              border: "1px dashed rgba(157,184,242,.4)",
              borderRadius: 4,
              padding: "3px 6px",
            }}
          >
            PROCEDURAL STAND-IN — NOT IN GLB
          </div>
        )}
        <div style={{ fontSize: 13, color: "#e7e5e4", lineHeight: 1.5, marginTop: 9 }}>{part.summary}</div>
        <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.55, marginTop: 8, paddingBottom: 13 }}>
          {part.detail}
        </div>
      </div>
      {specs.length > 0 && (
        <div style={{ borderTop: "1px solid #232328" }}>
          {specs.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 14,
                padding: "7px 16px",
                borderBottom: "1px solid #1c1c20",
              }}
            >
              <div
                style={{
                  font: "500 9.5px 'JetBrains Mono', monospace",
                  letterSpacing: ".12em",
                  color: "#71717a",
                  textTransform: "uppercase",
                  flex: "none",
                }}
              >
                {k}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#e7e5e4", textAlign: "right" }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
      {part.watch && (
        <div style={{ background: "rgba(214,178,112,.05)", borderTop: "1px solid rgba(214,178,112,.22)", padding: "10px 16px 13px" }}>
          <div style={{ font: "600 9px 'JetBrains Mono', monospace", letterSpacing: ".18em", color: "oklch(0.75 0.1 80)" }}>
            WATCH
          </div>
          <div style={{ fontSize: 12, color: "oklch(0.82 0.045 85)", lineHeight: 1.55, marginTop: 5 }}>{part.watch}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The scene: car + stand-ins + markers + card + camera rig + one animation loop.
function TeardownScene({ model, paint, paintTargets, breakdown, teardown, selectedId, explodeAmount, onSelect, onReady }) {
  const { scene: gltfScene } = useGLTF(model.url);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef();
  const carRef = useRef();
  const floorMatRef = useRef();
  const gridRef = useRef();
  const hotspotRefs = useRef({}); // id -> group (moved to live anchor each frame)
  const cardRef = useRef(); // group moved to the selected part's live anchor
  const cardInnerRef = useRef(); // card wrapper, flipped L/R by projected x

  const [hoverId, setHoverId] = useState(null);
  const parts = breakdown.parts;

  const rot = model.rotation ?? [0, 0, 0];

  // Clone + fit exactly like CarModel's GLTFCar (so anchors line up with how the
  // FC3 already renders), then clone every material once before any mutation — the
  // clone shares materials with the useGLTF cache, so highlight/paint must never
  // touch the originals. Each clone stashes its authored emissive/color for restore.
  const { object, fitScale, fitPos, paintMats } = useMemo(() => {
    const o = gltfScene.clone(true);
    o.rotation.set(rot[0], rot[1], rot[2]);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = model.scale != null ? model.scale : 3.4 / maxDim;
    const pos = model.scale != null ? model.position ?? [0, 0, 0] : [-center.x * s, -box.min.y * s, -center.z * s];

    const cloneMap = new Map();
    const pMats = [];
    const targets = new Set(paintTargets || []);
    o.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = true;
      const swap = (m) => {
        if (!m) return m;
        if (!cloneMap.has(m.uuid)) {
          const c = m.clone();
          c.userData.base = {
            emissive: c.emissive ? c.emissive.getHex() : null,
            emissiveIntensity: c.emissiveIntensity != null ? c.emissiveIntensity : 1,
            color: c.color ? c.color.getHex() : null,
            map: c.map || null,
            metalness: c.metalness != null ? c.metalness : null,
          };
          // Softer studio reflections than the FC3-era 0.9 — several launch cars use
          // metallic paints whose 0.9 env reflection read as a "glow" once they moved
          // from Viewer3D (no env map) onto this stage.
          if ("envMapIntensity" in c) c.envMapIntensity = 0.5;
          cloneMap.set(m.uuid, c);
          if (targets.has(c.name)) pMats.push(c);
        }
        return cloneMap.get(m.uuid);
      };
      n.material = Array.isArray(n.material) ? n.material.map(swap) : swap(n.material);
    });
    return { object: o, fitScale: s, fitPos: pos, paintMats: pMats };
  }, [gltfScene, rot[0], rot[1], rot[2], model.scale, paintTargets]);

  const recs = useMemo(() => buildRecords(object, parts), [object, parts]);
  const recById = useMemo(() => Object.fromEntries(recs.map((r) => [r.def.id, r])), [recs]);

  // Live prop mirror for the frame loop (useFrame closes over its first render).
  const live = useRef({});
  live.current.explodeAmount = explodeAmount;
  live.current.teardown = teardown;

  // Per-part animation + camera + floor state (refs → no re-render per frame).
  const anim = useRef(null);
  if (!anim.current) anim.current = {};
  const cam = useRef(null);
  const floor = useRef({ level: 1, target: 1 });
  const home = useRef(null);

  // Resolve each real mesh's explode direction in its own parent space (absorbs
  // fit_scale + node rotations), once the fitted world matrices are live.
  useLayoutEffect(() => {
    if (!carRef.current) return;
    carRef.current.updateWorldMatrix(true, true);
    const tb = new THREE.Box3();
    for (const rec of recs) {
      for (const m of rec.meshes) {
        tb.setFromObject(m);
        const center = tb.getCenter(new THREE.Vector3());
        const dirW = rec.explode.clone();
        if (rec.mirror) dirW.z = Math.abs(rec.explode.z) * (center.z >= 0 ? 1 : -1);
        const inv = new THREE.Matrix4().copy(m.parent.matrixWorld).invert();
        const dirP = dirW.applyMatrix3(new THREE.Matrix3().setFromMatrix4(inv));
        m.userData.td = { base: m.position.clone(), dir: dirP };
      }
      anim.current[rec.def.id] = anim.current[rec.def.id] || { t: 0, target: 0, delay: 0, dur: ENTER_S };
    }
    invalidate();
  }, [recs, invalidate]);

  // Capture the home camera framing once, and signal the model is ready.
  useEffect(() => {
    if (controlsRef.current) {
      home.current = {
        target: controlsRef.current.target.clone(),
        dist: camera.position.distanceTo(controlsRef.current.target),
      };
    }
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paint: recolour the body materials to the Showroom's selection (persists into
  // teardown). Mirrors CarModel — clone-once already done above; here we just set.
  useEffect(() => {
    for (const m of paintMats) {
      if (!m.color) continue;
      const b = m.userData.base;
      if (paint) {
        m.color.set(paint);
        // Drop the baked body texture while painted — otherwise `color` only TINTS
        // the authored paint, so on cars whose body is a coloured texture (FL5, GT-R,
        // Miata, M3) light swatches barely read. Nulling the map gives a clean solid
        // colour like the FC3's untextured shell. Restored to `Original` below.
        if (m.map) m.map = null;
        m.metalness = 0; // paint is dielectric; the studio env gives the sheen
      } else {
        if (b?.color != null) m.color.setHex(b.color);
        if (b && "map" in b) m.map = b.map; // restore the authored texture
        if (b?.metalness != null) m.metalness = b.metalness;
      }
      m.needsUpdate = true;
    }
    invalidate();
  }, [paint, paintMats, invalidate]);

  // Highlight: emissive boost on hover (0.40) / select (0.60), restore otherwise.
  useEffect(() => {
    for (const rec of recs) {
      const lvl = rec.def.id === selectedId ? 1 : rec.def.id === hoverId ? 0.55 : 0;
      for (const m of rec.mats) {
        if (!m.emissive) continue;
        const b = m.userData.base || {};
        if (lvl > 0) {
          m.emissive.setHex(ACCENT);
          m.emissiveIntensity = 0.16 + 0.44 * lvl;
        } else {
          m.emissive.setHex(b.emissive != null ? b.emissive : 0x000000);
          m.emissiveIntensity = b.emissiveIntensity != null ? b.emissiveIntensity : 1;
        }
      }
    }
    if (typeof document !== "undefined") document.body.style.cursor = hoverId ? "pointer" : "auto";
    invalidate();
  }, [hoverId, selectedId, recs, invalidate]);

  // Enter/exit: set each part's explode target + wave delay, open the orbit polar
  // limit, fade the floor. Kicks the frame loop.
  useEffect(() => {
    for (const rec of recs) {
      const a = anim.current[rec.def.id];
      if (!a) continue;
      a.target = teardown ? 1 : 0;
      a.delay = teardown ? waveDelayMs(rec.def.system) / 1000 : 0;
      a.dur = teardown ? ENTER_S : EXIT_S;
    }
    if (controlsRef.current) controlsRef.current.maxPolarAngle = teardown ? 2.35 : 1.5;
    floor.current.target = teardown ? 0 : 1;
    if (!teardown && hoverId) setHoverId(null);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teardown, recs, invalidate]);

  // Camera: glide to frame the selected part, or pull back to home. Uses the live
  // exploded bounds so it catches the whole part.
  useEffect(() => {
    if (!home.current || !controlsRef.current) return;
    let center, dist, elev;
    if (selectedId && recById[selectedId]) {
      const rec = recById[selectedId];
      const objs = rec.meshes.length ? rec.meshes : rec.proc ? [rec.proc.group] : [];
      const frame = partFrame(teardown ? objs : [], rec.anchor.clone(), rec.radius);
      center = frame.center;
      dist = frame.dist;
      const hd = Math.hypot(center.x, center.z);
      const low = center.y < 0.15;
      const high = center.y > 1.1 && hd > 0.5;
      dist = low ? Math.max(dist, 4.6) : dist;
      elev = low ? 0.16 : high ? -0.2 : 0.3;
    } else if (teardown) {
      // Overview: aim a touch higher and pull further back so the tall exploded
      // stack (body lifts a full unit) clears the spec strip up top and the
      // markers get room to breathe.
      center = new THREE.Vector3(0, 0.72, 0);
      dist = home.current.dist * 1.42;
      elev = null;
    } else {
      center = home.current.target.clone();
      dist = home.current.dist;
      elev = null;
    }
    const { from, to } = computeTween(camera.position, controlsRef.current.target, center, dist, elev);
    cam.current = { from, to, prog: 0 };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, teardown, recById]);

  // ── The single demand-frameloop animation task ──────────────────────────────
  const tmp = useRef(new THREE.Vector3()).current;
  useFrame((_, delta) => {
    const d = EXPLODE_DIST * (Number(live.current.explodeAmount) || 1);
    const dt = Math.min(delta, 0.05); // clamp long frames (tab refocus)
    let busy = false;

    // advance explode + apply per part
    for (const rec of recs) {
      const a = anim.current[rec.def.id];
      if (!a) continue;
      if (a.delay > 0) {
        a.delay = Math.max(0, a.delay - dt);
        busy = true;
      } else if (a.t !== a.target) {
        const step = dt / a.dur;
        a.t = a.t < a.target ? Math.min(a.target, a.t + step) : Math.max(a.target, a.t - step);
        busy = true;
      }
      const e2 = easeInOut(a.t);
      const k = e2 * d;
      for (const m of rec.meshes) {
        const td = m.userData.td;
        if (!td) continue;
        m.position.set(td.base.x + td.dir.x * k, td.base.y + td.dir.y * k, td.base.z + td.dir.z * k);
      }
      if (rec.proc) {
        const gp = rec.proc.group;
        gp.visible = a.t > 0.02;
        gp.position.set(
          rec.procBase.x + rec.anchorDir.x * k,
          rec.procBase.y + rec.anchorDir.y * k,
          rec.procBase.z + rec.anchorDir.z * k
        );
        gp.scale.setScalar(0.72 + 0.28 * e2);
        const f = clamp(e2 * 1.6, 0, 1);
        for (const pm of rec.proc.materials) {
          pm.opacity = f;
          pm.transparent = f < 0.999;
        }
      }
      // move the hotspot group to the part's live anchor
      const hs = hotspotRefs.current[rec.def.id];
      if (hs) hs.position.set(rec.anchor.x + rec.anchorDir.x * k, rec.anchor.y + rec.anchorDir.y * k, rec.anchor.z + rec.anchorDir.z * k);
      if (rec.def.id === selectedId && cardRef.current) {
        cardRef.current.position.set(
          rec.anchor.x + rec.anchorDir.x * k,
          rec.anchor.y + rec.anchorDir.y * k,
          rec.anchor.z + rec.anchorDir.z * k
        );
      }
    }

    // floor fade
    const fl = floor.current;
    if (Math.abs(fl.level - fl.target) > 0.002) {
      fl.level += (fl.target - fl.level) * Math.min(1, dt * 8);
      busy = true;
    } else fl.level = fl.target;
    if (floorMatRef.current) floorMatRef.current.opacity = 0.34 * fl.level;
    if (gridRef.current?.material) gridRef.current.material.opacity = 0.4 * fl.level;

    // camera glide
    if (cam.current) {
      const c = cam.current;
      c.prog = Math.min(1, c.prog + dt / CAM_S);
      const p = easeInOut(c.prog);
      camera.position.lerpVectors(c.from.p, c.to.p, p);
      controlsRef.current?.target.lerpVectors(c.from.t, c.to.t, p);
      controlsRef.current?.update();
      if (c.prog >= 1) cam.current = null;
      else busy = true;
    }

    // flip the info card to the side of the part that has more room
    if (selectedId && cardRef.current && cardInnerRef.current) {
      tmp.copy(cardRef.current.position).project(camera);
      const right = tmp.x < 0.15; // part left-of-center → card on the right
      cardInnerRef.current.style.transform = right
        ? "translate(30px,-46px)"
        : "translate(calc(-100% - 30px),-46px)";
    }

    if (busy) invalidate();
  });

  // ── Picking (only while torn down): distinguish a tap from an orbit drag ──────
  const down = useRef(null);
  const pickId = (e) => e.object?.userData?.partId ?? null;
  const onDown = (e) => {
    down.current = [e.clientX, e.clientY, performance.now()];
  };
  const onMove = (e) => {
    if (!teardown || down.current) return;
    e.stopPropagation();
    const id = pickId(e);
    if (id !== hoverId) setHoverId(id);
  };
  const onOut = () => {
    if (teardown) setHoverId(null);
  };
  const onClick = (e) => {
    const dn = down.current;
    down.current = null;
    if (!teardown || !dn) return;
    const dx = e.clientX - dn[0];
    const dy = e.clientY - dn[1];
    if (dx * dx + dy * dy > 36 || performance.now() - dn[2] > 500) return; // was a drag
    e.stopPropagation();
    onSelect(pickId(e));
  };

  const selectedRec = selectedId ? recById[selectedId] : null;

  return (
    <>
      <hemisphereLight args={[0x8fa0c0, 0x131318, 0.55]} />
      <directionalLight
        position={[3.5, 6, 2.5]}
        intensity={1.45}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      <directionalLight position={[-5, 2.5, -3]} intensity={0.3} color={ACCENT} />
      <StudioEnv />

      {/* Floor: shadow catcher + faint grid, both fade out in teardown */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial ref={floorMatRef} transparent opacity={0.34} />
      </mesh>
      <gridHelper ref={gridRef} args={[24, 48, 0x232329, 0x18181c]} position={[0, 0.001, 0]} />

      {/* Car + stand-ins share one picking group (partId lives on their meshes) */}
      <group onPointerDown={onDown} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick}>
        <primitive ref={carRef} object={object} scale={fitScale} position={fitPos} />
        {recs.map((rec) => (rec.proc ? <primitive key={rec.def.id} object={rec.proc.group} /> : null))}
      </group>

      {/* Hotspot markers — a group per part, moved to its live anchor each frame */}
      {recs.map((rec) => (
        <group
          key={rec.def.id}
          ref={(g) => {
            hotspotRefs.current[rec.def.id] = g;
          }}
          position={rec.anchor.toArray()}
        >
          <Html
            zIndexRange={hoverId === rec.def.id || selectedId === rec.def.id ? [58, 54] : [40, 10]}
            style={{ pointerEvents: "none" }}
          >
            <Marker
              rec={rec}
              teardown={teardown}
              hovered={hoverId === rec.def.id}
              selected={selectedId === rec.def.id}
              onHover={setHoverId}
              onSelect={onSelect}
            />
          </Html>
        </group>
      ))}

      {/* Info card — anchored to the selected part's live position */}
      {selectedRec && (
        <group ref={cardRef} position={selectedRec.anchor.toArray()}>
          <Html zIndexRange={[60, 50]} style={{ pointerEvents: "none" }}>
            <div ref={cardInnerRef} style={{ transform: "translate(30px,-46px)", width: "max-content" }}>
              <InfoCard
                part={selectedRec.def}
                idx={selectedRec.idx}
                total={parts.length}
                onClose={() => onSelect(null)}
              />
            </div>
          </Html>
        </group>
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={2.1}
        maxDistance={10}
        maxPolarAngle={teardown ? 2.35 : 1.5}
        target={[0, 0.55, 0]}
        onStart={() => {
          cam.current = null;
        }}
      />
    </>
  );
}

// WebGL-missing fallback (mirrors Viewer3D so the tab explains itself).
function NoWebGL() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <p className="max-w-md text-sm text-marble-mid">
        3D needs WebGL — turn on hardware acceleration and reload, or open in another browser.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas host. Same demand frameloop + dpr cap as Viewer3D, tuned camera for the
// teardown framing. Suspends (fallback null) while the GLB downloads.
export default function TeardownStage({
  model,
  paint = null,
  paintTargets = null,
  breakdown,
  teardown = false,
  selectedId = null,
  explodeAmount = 1.2,
  onSelect = () => {},
  onReady = () => {},
  onError = () => {},
}) {
  const [supported] = useState(hasWebGL);
  if (!supported) return <NoWebGL />;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ alpha: true }}
      camera={{ position: [4.6, 1.75, -3.6], fov: 34, near: 0.1, far: 100 }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
    >
      <Suspense fallback={null}>
        <TeardownScene
          model={model}
          paint={paint}
          paintTargets={paintTargets}
          breakdown={breakdown}
          teardown={teardown}
          selectedId={selectedId}
          explodeAmount={explodeAmount}
          onSelect={onSelect}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}
