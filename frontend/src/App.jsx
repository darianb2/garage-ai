import { useState } from "react";
import Landing from "./components/Landing";
import VehicleHub from "./components/VehicleHub";
import CompareView from "./components/CompareView";
import CompareTray from "./components/CompareTray";
import AskModal from "./components/AskModal";
import Credits from "./components/Credits";
import { PrimaryButton } from "./components/ui";

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
  const [browse, setBrowse] = useState(false); // Landing showing the full catalog
  const [showAsk, setShowAsk] = useState(false); // the global Ask Garage AI dialog
  const [showCredits, setShowCredits] = useState(false); // the photo-credits page

  // Landing hands us a car (tile click) or a car + AI answer (a question).
  const open = (v, ans = null) => {
    setVehicle(v);
    setAnswer(ans);
    setComparing(false);
    setBrowse(false);
    setShowCredits(false);
    window.scrollTo(0, 0);
  };
  const home = () => {
    setVehicle(null);
    setAnswer(null);
    setComparing(false);
    setBrowse(false);
    setShowCredits(false);
  };
  const openCredits = () => {
    setVehicle(null);
    setAnswer(null);
    setComparing(false);
    setBrowse(false);
    setShowCredits(true);
    window.scrollTo(0, 0);
  };
  // Nav: Catalog -> Landing in browse-all mode; Compare -> the side-by-side view
  // (which itself prompts to add cars when fewer than two are staged).
  const showCatalog = () => {
    setVehicle(null);
    setAnswer(null);
    setComparing(false);
    setBrowse(true);
    setShowCredits(false);
    window.scrollTo(0, 0);
  };
  const openCompare = () => {
    setVehicle(null);
    setComparing(true);
    setShowCredits(false);
    window.scrollTo(0, 0);
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

  // "Ask AI" (nav): go home and focus the hero search — it doubles as the ask box
  // (a question-shaped query routes to Garage AI). In the Hub, Profile mode is the
  // primary Ask surface.
  // The MARBLE nav is app chrome for the Landing/Compare views; inside the Hub the
  // Hub's own top bar is the header (per the design mocks), so the global nav hides.
  const inHub = vehicle && !comparing;

  return (
    <div className="min-h-full bg-marble-bg text-marble-body">
      {!inHub && (
        <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-marble-bg/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
            <button onClick={home} className="flex shrink-0 items-center gap-2.5">
              <span
                className="marble-veins relative h-[26px] w-[26px] overflow-hidden rounded-[7px]"
                style={{ background: "linear-gradient(135deg,#2a2a30,#0c0c0e)" }}
              />
              <span className="text-[15px] font-bold tracking-[0.16em] text-marble-hi">MARBLE</span>
              <span className="hidden rounded-[4px] border border-marble-accent/35 px-1.5 py-0.5 font-mono text-[10px] font-medium text-marble-accent sm:inline">
                POCKET MECHANIC
              </span>
            </button>
            <nav className="ml-auto flex items-center gap-5 text-[13px] text-marble-mid">
              <button onClick={home} className="hidden hover:text-marble-body sm:inline">Explore</button>
              <button onClick={openCompare} className="hidden hover:text-marble-body sm:inline">
                Compare{compare.length > 0 ? ` (${compare.length})` : ""}
              </button>
              <button onClick={showCatalog} className="hidden hover:text-marble-body sm:inline">Catalog</button>
              <PrimaryButton onClick={() => setShowAsk(true)} className="px-4 py-2 text-[13px]">Ask AI</PrimaryButton>
            </nav>
          </div>
        </div>
      )}

      {/* Pad the bottom so the fixed compare tray never covers the last row. */}
      <main className={compare.length > 0 && !comparing ? "pb-24" : ""}>
        {showCredits ? (
          <Credits onBack={home} />
        ) : comparing ? (
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
          <Landing onSelect={open} onCompare={addCompare} inCompare={inCompare} browse={browse} />
        )}
      </main>

      {/* Footer (app chrome, hidden inside the Hub like the top nav). Carries the
          photo-credits link — CC-BY/CC-BY-SA hero photos need visible attribution. */}
      {!inHub && (
        <footer className="border-t border-white/[0.07]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-[12px] text-marble-dim">
            <span>MARBLE · pocket mechanic — specs from curated data + NHTSA</span>
            <button onClick={openCredits} className="hover:text-marble-accent">
              Photo credits
            </button>
          </div>
        </footer>
      )}

      {!comparing && (
        <CompareTray
          items={compare}
          max={MAX_COMPARE}
          onRemove={removeCompare}
          onClear={clearCompare}
          onCompare={startCompare}
        />
      )}

      {showAsk && <AskModal onClose={() => setShowAsk(false)} onOpen={open} />}
    </div>
  );
}
