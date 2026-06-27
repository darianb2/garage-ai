import { useState } from "react";
import Viewer3D from "./Viewer3D";
import { computeSystems } from "../lib/systems";
import { modelFor, primarySlug } from "../lib/models";
import { Badge } from "./ui";

// The 3D Model tab: the car (real glTF when we have one, else the procedural
// placeholder) + clickable system hotspots + a detail panel, all bound to live
// NHTSA data.
export default function ThreeDView({ profile, vehicle }) {
  const [selected, setSelected] = useState(null);
  const systems = profile ? computeSystems(profile) : null;
  const sel = systems?.find((s) => s.key === selected) || null;
  const model = modelFor(vehicle);
  const slug = primarySlug(vehicle);

  return (
    <div className="relative h-[70vh] overflow-hidden rounded-xl border border-zinc-800">
      <Viewer3D systems={systems} selected={selected} onSelect={setSelected} model={model} />

      {/* hints (top-left) */}
      <div className="pointer-events-none absolute left-3 top-3 space-y-1 text-xs">
        <p className="text-zinc-500">
          {systems ? "Click a marker on the car to inspect a system" : "Loading data…"}
        </p>
        <p className={model ? (model.demo ? "text-amber-400" : "text-emerald-400") : "text-zinc-600"}>
          {model
            ? model.demo
              ? "demo model · generic stand-in, not the real car"
              : "real 3D model"
            : `placeholder car · add models/${slug || "<car>"}.glb`}
        </p>
      </div>

      {/* system list (top-right) */}
      {systems && (
        <div className="absolute right-3 top-3 w-48 space-y-1">
          {systems
            .filter((s) => s.hotspot)
            .map((s) => (
              <button
                key={s.key}
                onClick={() => setSelected(s.key === selected ? null : s.key)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-1 text-left text-xs ${
                  s.key === selected
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span>{s.label}</span>
                {s.recalls.length > 0 && <Badge tone="red">{s.recalls.length}</Badge>}
              </button>
            ))}
        </div>
      )}

      {/* selected system detail (bottom) */}
      {sel && (
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100">{sel.label}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              close
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>
              <b className="text-amber-500">{sel.issueCount}</b> owner complaints
            </span>
            <span>
              <b className="text-amber-500">{sel.recalls.length}</b> recalls
            </span>
          </div>
          {sel.recalls.slice(0, 2).map((r, i) => (
            <p key={i} className="mt-1 text-xs text-zinc-400">
              ↳ {r.component}
            </p>
          ))}
          {sel.issueCount === 0 && sel.recalls.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">No NHTSA reports for this system.</p>
          )}
        </div>
      )}
    </div>
  );
}
