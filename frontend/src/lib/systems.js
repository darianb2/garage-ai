// The car's major systems, each mapped to (a) the NHTSA component keywords that
// indicate it and (b) a 3D position on the car for its clickable hotspot. Shared
// by the Mechanical Breakdown list and the interactive 3D markers so they agree.
//
// Hotspot coordinates are in the car group's space, where every model is fitted
// to ~3.4 units long and grounded at y=0: +X is the nose (front), -X the tail,
// ±Z the right/left sides, +Y up. Real launch-car models are low sports cars
// (~1.0 tall, ~1.45 wide once fitted), so markers stay low (y well under the
// ~1.0 roofline) and inboard (|z| < ~0.7) to sit ON the body rather than float
// above the roof or off to the sides. Each marker is placed near the real part:
// engine on the hood, suspension/brakes at the wheels, fuel at the tail, etc.

const hits = (name, keys) => {
  const n = (name || "").toLowerCase();
  return keys.some((k) => n.includes(k));
};

export const SYSTEMS = [
  { key: "engine", label: "Engine", match: ["engine", "powertrain", "power train"], hotspot: [1.2, 0.6, 0] },
  { key: "suspension", label: "Suspension & Steering", match: ["suspension", "steering"], hotspot: [1.0, 0.48, 0.6] },
  { key: "brakes", label: "Brakes", match: ["brake"], hotspot: [-1.05, 0.4, 0.62] },
  { key: "drivetrain", label: "Drivetrain", match: ["transmission", "driveline", "driveshaft", "drive shaft", "clutch", "axle"], hotspot: [-0.15, 0.34, 0] },
  { key: "electrical", label: "Electrical", match: ["electrical", "battery", "wiring", "lighting"], hotspot: [1.05, 0.55, -0.45] },
  { key: "fuel", label: "Fuel System", match: ["fuel"], hotspot: [-1.3, 0.42, 0] },
  { key: "safety", label: "Airbags & Restraints", match: ["air bag", "airbag", "seat belt", "restraint", "occupant"], hotspot: [0.25, 0.78, 0] },
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
