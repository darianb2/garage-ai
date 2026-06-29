import { Card, Badge } from "../ui";
import { computeSystems } from "../../lib/systems";

// The list view of the mechanical breakdown. Shares system definitions + data
// binding with the interactive 3D hotspots (lib/systems.js).
export default function BreakdownPanel({ profile }) {
  const systems = computeSystems(profile);
  const max = Math.max(1, ...systems.map((s) => s.issueCount));

  return (
    <div>
      <Card className="mb-4 p-4">
        <p className="text-sm text-zinc-400">
          Each major system is bound to live NHTSA data for this car — owner-complaint
          volume and open recalls.{" "}
          <span className="text-zinc-500">
            The 3D Model tab shows the same data as clickable hotspots on the car.
          </span>
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {systems.map((sys) => {
          // A system with no complaints and no recalls is good news, not missing
          // data — show it as a clean, healthy state rather than an empty bar.
          const clean = sys.issueCount === 0 && sys.recalls.length === 0;
          return (
            <Card key={sys.label} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-100">{sys.label}</h3>
                {sys.recalls.length > 0 && (
                  <Badge tone="red">
                    {sys.recalls.length} recall{sys.recalls.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              <div className="mt-2 h-1.5 rounded bg-zinc-800">
                <div
                  className={`h-1.5 rounded ${clean ? "bg-emerald-500/40" : "bg-amber-500"}`}
                  style={{ width: clean ? "100%" : `${(sys.issueCount / max) * 100}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${clean ? "text-emerald-400/80" : "text-zinc-500"}`}>
                {sys.issueCount > 0
                  ? `${sys.issueCount} owner complaint${sys.issueCount === 1 ? "" : "s"}`
                  : clean
                    ? "No reported issues for this system"
                    : "No owner complaints filed"}
              </p>
              {sys.recalls.slice(0, 2).map((r, i) => (
                <p key={i} className="mt-2 text-xs text-zinc-400">
                  ↳ {r.component}
                </p>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
