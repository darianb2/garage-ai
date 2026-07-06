// Warm the on-demand 3D chunk (three.js/drei/Viewer3D) and prefetch a model file
// on user intent (hovering a 3D-capable card), so opening the Showroom doesn't
// wait on either the code or the download. Both are no-ops after the first call
// per target, so it's cheap to wire onto every hover.
//
// The dynamic import here points at the SAME module Stage3D lazy-loads, so they
// share one chunk — warming via hover primes exactly what the click needs.
let chunkPromise;
const prefetched = new Set();

export function warm3DChunk() {
  chunkPromise ||= import("../components/Viewer3D");
  return chunkPromise;
}

export function warm3D(modelUrl) {
  warm3DChunk();
  if (modelUrl && !prefetched.has(modelUrl)) {
    prefetched.add(modelUrl);
    // Warm the browser HTTP cache; drei's useGLTF then loads it from cache.
    fetch(modelUrl).catch(() => {});
  }
}
