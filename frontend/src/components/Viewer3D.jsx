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
          <span className="text-marble-accent">chrome://gpu</span> to check WebGL status.
        </p>
      </div>
    </div>
  );
}

export default function Viewer3D({
  systems = null,
  selected = null,
  onSelect = () => {},
  model = null,
  spin = null, // null = auto (spin only while loading); pass false to force still
  dark = false, // Marble Hub stage: transparent canvas over the .marble-stage gradient
}) {
  // Check once on mount; if WebGL is unavailable, never mount the Canvas.
  const [supported] = useState(hasWebGL);
  if (!supported) return <Fallback />;

  const doSpin = spin == null ? !systems : spin;

  return (
    <Canvas
      shadows
      // Cap the render resolution (phones report dpr 3 — a ~2.25x fragment-shading
      // cost for no visible gain here) and only draw frames when something changes.
      // The Showroom/Explode stage is static (spin=false), so "demand" means near-
      // zero idle GPU; OrbitControls invalidates on drag and a resolved model
      // commits a frame. Auto-spin (loading) needs continuous frames -> "always".
      dpr={[1, 2]}
      frameloop={doSpin ? "always" : "demand"}
      gl={{ alpha: true }}
      camera={{ position: [4.6, 1.5, 1.9], fov: 45 }}
      onPointerMissed={() => onSelect(null)}
    >
      {/* Grey studio bg for the legacy view; the Marble stage is transparent so the
          dark radial gradient behind the canvas shows through. */}
      {!dark && <color attach="background" args={["#52525b"]} />}
      <ambientLight intensity={dark ? 0.7 : 0.85} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#5a8cf0" />
      <CarModel spin={doSpin} systems={systems} selected={selected} onSelect={onSelect} model={model} />
      <ContactShadows position={[0, 0, 0]} opacity={dark ? 0.75 : 0.6} scale={7} blur={2.5} far={2.5} />
      {!dark && <gridHelper args={[24, 24, "#8b8b92", "#52525b"]} position={[0, -0.001, 0]} />}
      <OrbitControls enablePan={false} target={[0, 0.45, 0]} minDistance={2.5} maxDistance={12} />
    </Canvas>
  );
}
