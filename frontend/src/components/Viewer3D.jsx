import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { hasWebGL } from "../lib/webgl";

// Placeholder "vehicle": a slowly rotating shape standing in for the real glTF
// car model we'll load per launch car (Miata / Supra / M3 / GT-R). Proves the
// R3F render loop + controls; the real models replace this in Phase 8.3.
function Placeholder() {
  const mesh = useRef();
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.4;
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[2, 0.6, 1]} />
      <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

// Shown when the browser can't start WebGL — so the tab explains itself instead
// of rendering a blank, broken canvas.
function Fallback() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <p className="text-lg font-semibold text-zinc-200">3D viewer needs WebGL</p>
        <p className="mt-2 text-sm text-zinc-400">
          Your browser couldn't start a WebGL context, so the 3D model can't render
          here. Turn on hardware acceleration (or WebGL) and reload, or open the app in
          a different browser. In Chrome, visit{" "}
          <span className="text-amber-400">chrome://gpu</span> to check WebGL status.
        </p>
      </div>
    </div>
  );
}

export default function Viewer3D() {
  // Check once on mount; if WebGL is unavailable, never mount the Canvas.
  const [supported] = useState(hasWebGL);
  if (!supported) return <Fallback />;

  return (
    <Canvas camera={{ position: [4, 2.5, 4], fov: 45 }}>
      <color attach="background" args={["#0a0a0b"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Placeholder />
      <gridHelper args={[20, 20, "#3f3f46", "#27272a"]} position={[0, -0.4, 0]} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </Canvas>
  );
}
