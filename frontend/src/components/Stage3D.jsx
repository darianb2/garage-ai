import { lazy, Suspense } from "react";

// Lazy boundary for the 3D engine. three.js + drei + the GLTF loader live ONLY
// under Viewer3D, so importing it dynamically here splits them into their own
// chunk that downloads on demand (when a car's Showroom/Explode opens) instead of
// weighing down the initial app bundle for the landing/catalog. warm3D() in
// lib/preload3d prefetches this same chunk on hover so the click still feels
// instant. Drop-in replacement for Viewer3D — forwards all props.
const Viewer3D = lazy(() => import("./Viewer3D"));

function StageLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="animate-pulse font-mono text-[11px] tracking-wide text-marble-dim">
        loading 3D…
      </span>
    </div>
  );
}

export default function Stage3D(props) {
  return (
    <Suspense fallback={<StageLoading />}>
      <Viewer3D {...props} />
    </Suspense>
  );
}
