import { useState } from "react";
import Landing from "./components/Landing";
import VehicleHub from "./components/VehicleHub";

// Simple state-based navigation for now: no vehicle = landing, a vehicle = its
// Hub. (URL routing / deep links come later when we add react-router.)
export default function App() {
  const [vehicle, setVehicle] = useState(null);

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <button
            onClick={() => setVehicle(null)}
            className="text-lg font-bold tracking-tight"
          >
            <span className="text-amber-500">Garage</span> AI
          </button>
        </div>
      </div>

      {vehicle ? (
        <VehicleHub vehicle={vehicle} onBack={() => setVehicle(null)} />
      ) : (
        <Landing onSelect={setVehicle} />
      )}
    </div>
  );
}
