// Detect whether the browser can actually create a WebGL context. Some
// environments can't — hardware acceleration turned off, GPU blocklisted, VMs,
// remote desktops — and the 3D viewer needs one. We check up front so we can
// show a graceful fallback instead of a blank canvas plus a thrown context error.
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}
