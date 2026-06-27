import { Card, Badge } from "../ui";

// Major vehicle systems. Each binds to live NHTSA data by matching the component
// names in complaints + recalls. This is the data layer the future interactive
// 3D hotspots will surface when you click a part of the model (Phase 8.4).
const SYSTEMS = [
  { label: "Engine", match: ["engine", "powertrain", "power train"] },
  { label: "Drivetrain", match: ["transmission", "driveline", "driveshaft", "drive shaft", "clutch", "axle"] },
  { label: "Suspension & Steering", match: ["suspension", "steering"] },
  { label: "Brakes", match: ["brake"] },
  { label: "Electrical", match: ["electrical", "battery", "wiring", "lighting"] },
  { label: "Fuel System", match: ["fuel"] },
  { label: "Airbags & Restraints", match: ["air bag", "airbag", "seat belt", "restraint", "occupant"] },
  { label: "Body & Exterior", match: ["body", "structure", "exterior", "latch", "door", "wheel", "tire"] },
];

function hits(name, keys) {
  const n = (name || "").toLowerCase();
  return keys.some((k) => n.includes(k));
}

export default function BreakdownPanel({ profile }) {
  const issues = profile.common_issues || []; // [[componentName, count], ...]
  const recalls = profile.recalls || [];

  const systems = SYSTEMS.map((sys) => {
    const issueCount = issues
      .filter(([name]) => hits(name, sys.match))
      .reduce((sum, [, count]) => sum + count, 0);
    const sysRecalls = recalls.filter((r) => hits(r.component, sys.match));
    return { ...sys, issueCount, recalls: sysRecalls };
  });
  const max = Math.max(1, ...systems.map((s) => s.issueCount));

  return (
    <div>
      <Card className="mb-4 p-4">
        <p className="text-sm text-zinc-400">
          Each major system is bound to live NHTSA data for this car — owner-complaint
          volume and open recalls.{" "}
          <span className="text-zinc-500">
            Interactive 3D hotspots on the model come next; this is the data they'll surface.
          </span>
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {systems.map((sys) => (
          <Card key={sys.label} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-zinc-100">{sys.label}</h3>
              {sys.recalls.length > 0 && (
                <Badge tone="red">
                  {sys.recalls.length} recall{sys.recalls.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="mt-2 h-1.5 rounded bg-zinc-800">
              <div
                className="h-1.5 rounded bg-amber-500"
                style={{ width: `${(sys.issueCount / max) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {sys.issueCount > 0 ? `${sys.issueCount} owner complaints` : "No reports on file"}
            </p>
            {sys.recalls.slice(0, 2).map((r, i) => (
              <p key={i} className="mt-2 text-xs text-zinc-400">
                ↳ {r.component}
              </p>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
