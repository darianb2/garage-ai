import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { hasWebGL } from "../lib/webgl";
import CarModel from "./CarModel";

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

export default function Viewer3D({ systems = null, selected = null, onSelect = () => {}, model = null }) {
  // Check once on mount; if WebGL is unavailable, never mount the Canvas.
  const [supported] = useState(hasWebGL);
  if (!supported) return <Fallback />;

  return (
    <Canvas shadows camera={{ position: [4.5, 2.5, 5], fov: 45 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={["#0a0a0b"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.3} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#f59e0b" />
      {/* Spin while data is loading (no systems yet); settle + show hotspots once loaded. */}
      <CarModel spin={!systems} systems={systems} selected={selected} onSelect={onSelect} model={model} />
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={12} blur={2.4} far={4} />
      <gridHelper args={[24, 24, "#3f3f46", "#1f1f23"]} position={[0, -0.001, 0]} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </Canvas>
  );
}
