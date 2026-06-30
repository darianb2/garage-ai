import { useState } from "react";
import Landing from "./components/Landing";
import VehicleHub from "./components/VehicleHub";
import CompareView from "./components/CompareView";
import CompareTray from "./components/CompareTray";

const MAX_COMPARE = 3;

// Identity for a staged car (model + generation + year), so the compare tray can
// dedupe and remove the exact vehicle the user picked.
const keyOf = (v) =>
  `${v.make} ${v.model} ${v.generation || ""} ${v.year}`.toLowerCase();

// Simple state-based navigation for now: no vehicle = landing, a vehicle = its
// Hub, comparing = the side-by-side view (Task 8). (URL routing / deep links come
// later when we add react-router.) When a homepage question routes here, `answer`
// rides along so the Hub shows it on top.
export default function App() {
  const [vehicle, setVehicle] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [compare, setCompare] = useState([]); // cars staged for side-by-side
  const [comparing, setComparing] = useState(false); // showing the compare view

  // Landing hands us a car (tile click) or a car + AI answer (a question).
  const open = (v, ans = null) => {
    setVehicle(v);
    setAnswer(ans);
    setComparing(false);
    window.scrollTo(0, 0);
  };
  const home = () => {
    setVehicle(null);
    setAnswer(null);
    setComparing(false);
  };

  // Stage a car for comparison (delegated up from tiles and the Hub). Dedupes by
  // identity and caps the tray at MAX_COMPARE so the table stays readable.
  const addCompare = (v) =>
    setCompare((cur) =>
      cur.length >= MAX_COMPARE || cur.some((c) => keyOf(c) === keyOf(v))
        ? cur
        : [...cur, v],
    );
  const removeCompare = (v) =>
    setCompare((cur) => cur.filter((c) => keyOf(c) !== keyOf(v)));
  const clearCompare = () => {
    setCompare([]);
    setComparing(false);
  };
  const startCompare = () => {
    if (compare.length >= 2) {
      setComparing(true);
      window.scrollTo(0, 0);
    }
  };
  const inCompare = (v) => compare.some((c) => keyOf(c) === keyOf(v));

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <button onClick={home} className="text-lg font-bold tracking-tight">
            <span className="text-amber-500">Garage</span> AI
          </button>
        </div>
      </div>

      {/* Pad the bottom so the fixed compare tray never covers the last row. */}
      <main className={compare.length > 0 && !comparing ? "pb-24" : ""}>
        {comparing ? (
          <CompareView
            vehicles={compare}
            onBack={() => setComparing(false)}
            onOpen={open}
            onRemove={removeCompare}
          />
        ) : vehicle ? (
          <VehicleHub
            vehicle={vehicle}
            answer={answer}
            onBack={home}
            onCompare={addCompare}
            inCompare={inCompare(vehicle)}
          />
        ) : (
          <Landing onSelect={open} onCompare={addCompare} inCompare={inCompare} />
        )}
      </main>

      {!comparing && (
        <CompareTray
          items={compare}
          max={MAX_COMPARE}
          onRemove={removeCompare}
          onClear={clearCompare}
          onCompare={startCompare}
        />
      )}
    </div>
  );
}
