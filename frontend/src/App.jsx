import { useState } from "react";
import Landing from "./components/Landing";
import VehicleHub from "./components/VehicleHub";

// Simple state-based navigation for now: no vehicle = landing, a vehicle = its
// Hub. (URL routing / deep links come later when we add react-router.) When a
// homepage question routes here, `answer` rides along so the Hub shows it on top.
export default function App() {
  const [vehicle, setVehicle] = useState(null);
  const [answer, setAnswer] = useState(null);

  // Landing hands us a car (tile click) or a car + AI answer (a question).
  const open = (v, ans = null) => {
    setVehicle(v);
    setAnswer(ans);
    window.scrollTo(0, 0);
  };
  const home = () => {
    setVehicle(null);
    setAnswer(null);
  };

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <button onClick={home} className="text-lg font-bold tracking-tight">
            <span className="text-amber-500">Garage</span> AI
          </button>
        </div>
      </div>

      {vehicle ? (
        <VehicleHub vehicle={vehicle} answer={answer} onBack={home} />
      ) : (
        <Landing onSelect={open} />
      )}
    </div>
  );
}
