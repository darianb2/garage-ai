import { useEffect, useState } from "react";
import { getProfile } from "../lib/api";
import { Badge, Spinner } from "./ui";
import Viewer3D from "./Viewer3D";
import ProfilePanel from "./panels/ProfilePanel";
import BreakdownPanel from "./panels/BreakdownPanel";

const TABS = [
  { id: "profile", label: "Overview" },
  { id: "3d", label: "3D Model" },
  { id: "breakdown", label: "Mechanical Breakdown" },
];

// The Vehicle Hub: one car, three linked layers (profile / 3D / breakdown), all
// fed by the data engine. `vehicle` carries { make, model, year, generation?,
// body?, note? } from a catalog card or the free-form research form.
export default function VehicleHub({ vehicle, onBack }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError(null);
    getProfile(vehicle)
      .then((p) => active && setProfile(p))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [vehicle]);

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={onBack} className="text-sm text-zinc-400 hover:text-amber-400">
        ← All vehicles
      </button>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {vehicle.generation && <Badge tone="amber">{vehicle.generation}</Badge>}
        {vehicle.body && <Badge>{vehicle.body}</Badge>}
      </div>
      {vehicle.note && <p className="mt-1 text-zinc-400">{vehicle.note}</p>}

      <nav className="mt-6 flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {tab === "3d" ? (
          <div className="h-[70vh] overflow-hidden rounded-xl border border-zinc-800">
            <Viewer3D />
          </div>
        ) : error ? (
          <p className="text-red-300">{error}</p>
        ) : !profile ? (
          <Spinner label={`Researching ${title}…`} />
        ) : tab === "profile" ? (
          <ProfilePanel profile={profile} />
        ) : (
          <BreakdownPanel profile={profile} />
        )}
      </div>
    </div>
  );
}
