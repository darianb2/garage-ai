// Model mesh-inventory + part-anchor tool (backend data pipeline for the Teardown
// feature). Loads a GLB exactly the way CarModel.jsx / TeardownStage.jsx do — bakes
// the model's REGISTRY transform (rotation, then either an explicit scale+position
// or an auto-fit: scale so max dim = 3.4 units, ground to y=0) — and reports every
// mesh's material + bounding box IN FITTED CAR SPACE (the same coordinate frame
// lib/systems.js hotspots use: +X nose, +Y up, ±Z sides).
//
// The transform is read straight from src/lib/models.js MODELS[slug], keyed off the
// GLB filename, so this stays a single source of truth with what the app renders.
//
// With a part-map (JSON: { partId: ["materialSubstr", ...] }) it also groups meshes
// into logical parts and prints each part's fitted centroid (the anchor), size, mesh
// count, and matched materials — plus any materials left unmatched, so nothing is
// silently dropped. Grouping is FIRST-MATCH-WINS in part order, exactly like the
// frontend's buildRecords `taken` set, so over-matching substrings (e.g. FG4's
// `CIVIC13` vs `CIVIC13_rin`, or the GT-R transmission's bare `material` vs
// `PaletteMaterial00N`) resolve the same way here as on screen. Order specific parts
// before general ones. Used to author data/breakdowns/<slug>.json.
//
// Usage (run from the frontend/ dir so node_modules resolves):
//   node scripts/model_meshes.mjs /models/<slug>.glb [partmap.json]
// The GLB path is a server path; /models/* is served from public/models (Flask's
// MODELS_DIR). Meshopt-compressed GLBs need a browser, so this drives headless
// Chromium via Playwright, like _render.mjs.
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MODELS } from "../src/lib/models.js";

const FRONTEND = path.resolve(fileURLToPath(import.meta.url), "../../");
const glbPath = process.argv[2];
const partmapPath = process.argv[3];
if (!glbPath) {
  console.error("usage: node scripts/model_meshes.mjs /models/<slug>.glb [partmap.json]");
  process.exit(1);
}
const partmap = partmapPath ? JSON.parse(fs.readFileSync(partmapPath, "utf8")) : null;

// Registry transform for this model (matches TeardownStage's fit): rotation, and
// either an explicit scale (+ position) or auto-fit when scale is absent.
const slug = decodeURIComponent(glbPath.split("?")[0].split("/").pop().replace(/\.glb$/i, ""));
const reg = MODELS[slug] || {};
const rot = reg.rotation ?? [0, 0, 0];
const scale = reg.scale ?? null;
const position = reg.position ?? [0, 0, 0];
if (!MODELS[slug]) console.error(`[warn] no registry entry for "${slug}" — using rot ${JSON.stringify(rot)}, auto-fit`);

const PAGE = `<!doctype html><html><head><meta charset=utf-8>
<script type=importmap>{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type=module>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const q = new URLSearchParams(location.search);
const rot = JSON.parse(q.get('rot') || '[0,0,0]');
const scaleParam = q.get('scale');
const posParam = q.get('pos');
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(q.get('model'), (g) => {
  const o = g.scene; o.rotation.set(rot[0], rot[1], rot[2]); o.updateMatrixWorld(true);
  const full = new THREE.Box3().setFromObject(o);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  full.getSize(size); full.getCenter(center);
  const s = scaleParam ? parseFloat(scaleParam) : 3.4 / (Math.max(size.x, size.y, size.z) || 1);
  const pos = scaleParam ? JSON.parse(posParam || '[0,0,0]') : [-center.x*s, -full.min.y*s, -center.z*s];
  const fit = (v) => [ +(v.x*s+pos[0]).toFixed(3), +(v.y*s+pos[1]).toFixed(3), +(v.z*s+pos[2]).toFixed(3) ];
  const meshes = [];
  o.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const b = new THREE.Box3().setFromObject(n); if (b.isEmpty() || !isFinite(b.min.x)) return;
    meshes.push({ name: n.name || '', material: (n.material && n.material.name) || '', min: fit(b.min), max: fit(b.max) });
  });
  window.__out = { scale: +s.toFixed(5), meshes };
  window.__done = true;
}, undefined, (e) => { window.__err = String((e && e.message) || e); window.__done = true; });
</script></body></html>`;

const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/_meshpage") { res.setHeader("Content-Type", "text/html"); return res.end(PAGE); }
  if (p.startsWith("/models/")) p = "/public" + p; // mirror Flask MODELS_DIR
  const file = path.join(FRONTEND, p);
  if (!file.startsWith(FRONTEND) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
const params = new URLSearchParams({ model: glbPath, rot: JSON.stringify(rot) });
if (scale != null) { params.set("scale", String(scale)); params.set("pos", JSON.stringify(position)); }
await page.goto(`http://localhost:${port}/_meshpage?${params.toString()}`);
await page.waitForFunction(() => window.__done === true, { timeout: 45000 });
const err = await page.evaluate(() => window.__err || null);
const out = await page.evaluate(() => window.__out || null);
await browser.close();
server.close();
if (err) { console.error("LOAD ERROR:", err); process.exit(1); }

// Group by part-map (case-insensitive material substring) → fitted anchor + size.
const union = (rows) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const r of rows) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], r.min[i]); mx[i] = Math.max(mx[i], r.max[i]); }
  return { min: mn, max: mx, centroid: mn.map((v, i) => +((v + mx[i]) / 2).toFixed(3)), size: mn.map((v, i) => +(mx[i] - v).toFixed(3)) };
};
const result = { slug, scale: out.scale, meshCount: out.meshes.length };
if (partmap) {
  // First-match-wins across parts (mirrors frontend buildRecords `taken`): a mesh is
  // claimed by the first partmap entry whose substrings match, so anchors reflect the
  // exact grouping the stage renders. Order specific parts before general ones.
  const takenIdx = new Set();
  const claimed = new Set();
  result.parts = {};
  for (const [id, pats] of Object.entries(partmap)) {
    const rows = [];
    out.meshes.forEach((m, i) => {
      if (takenIdx.has(i)) return;
      if (pats.some((p) => m.material.toLowerCase().includes(p.toLowerCase()))) { rows.push(m); takenIdx.add(i); claimed.add(m.material); }
    });
    if (rows.length) {
      const g = union(rows);
      result.parts[id] = { meshCount: rows.length, materials: [...new Set(rows.map((r) => r.material))], anchor: g.centroid, size: g.size, min: g.min, max: g.max };
    } else {
      result.parts[id] = { meshCount: 0, materials: [], anchor: null, note: "NO MESHES MATCHED" };
    }
  }
  result.unmatchedMaterials = [...new Set(out.meshes.map((m) => m.material))].filter((m) => !claimed.has(m));
} else {
  result.materials = [...new Set(out.meshes.map((m) => m.material))];
}
console.log(JSON.stringify(result, null, 2));
