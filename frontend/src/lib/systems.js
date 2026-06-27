// The car's major systems, each mapped to (a) the NHTSA component keywords that
// indicate it and (b) a 3D position on the car for its clickable hotspot. Shared
// by the Mechanical Breakdown list and the interactive 3D markers so they agree.

const hits = (name, keys) => {
  const n = (name || "").toLowerCase();
  return keys.some((k) => n.includes(k));
};

export const SYSTEMS = [
  { key: "engine", label: "Engine", match: ["engine", "powertrain", "power train"], hotspot: [1.35, 0.8, 0] },
  { key: "suspension", label: "Suspension & Steering", match: ["suspension", "steering"], hotspot: [1.15, 0.55, 0.9] },
  { key: "brakes", label: "Brakes", match: ["brake"], hotspot: [-1.15, 0.4, 0.9] },
  { key: "drivetrain", label: "Drivetrain", match: ["transmission", "driveline", "driveshaft", "drive shaft", "clutch", "axle"], hotspot: [-0.25, 0.32, 0] },
  { key: "electrical", label: "Electrical", match: ["electrical", "battery", "wiring", "lighting"], hotspot: [-0.15, 1.18, 0] },
  { key: "fuel", label: "Fuel System", match: ["fuel"], hotspot: [-1.55, 0.6, 0] },
  { key: "safety", label: "Airbags & Restraints", match: ["air bag", "airbag", "seat belt", "restraint", "occupant"], hotspot: [-0.15, 0.95, 0.72] },
  { key: "body", label: "Body & Exterior", match: ["body", "structure", "exterior", "latch", "door", "wheel", "tire"] },
];

// For a profile, return each system with its live complaint count + matching recalls.
export function computeSystems(profile) {
  const issues = profile?.common_issues || []; // [[componentName, count], ...]
  const recalls = profile?.recalls || [];
  return SYSTEMS.map((sys) => {
    const issueCount = issues
      .filter(([name]) => hits(name, sys.match))
      .reduce((sum, [, count]) => sum + count, 0);
    const sysRecalls = recalls.filter((r) => hits(r.component, sys.match));
    return { ...sys, issueCount, recalls: sysRecalls };
  });
}
