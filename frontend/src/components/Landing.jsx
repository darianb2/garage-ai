import { useEffect, useState } from "react";
import { getCatalog, askAnswer } from "../lib/api";
import { Spinner, Mono, PrimaryButton } from "./ui";
import CatalogGrid from "./CatalogGrid";

// The 4 locked launch cars — showcase quality. Years/chassis are display strings;
// the vehicle object is what opens the Hub (generation chosen so the 3D model +
// curated specs both resolve — Miata opens at 2019 for the ND2 spec sheet, Supra
// keeps "A80 (Mk4)" to match the model registry key).
const LAUNCH = [
  { name: "Mazda MX-5 Miata", chassis: "ND", years: "2015–now",
    vehicle: { make: "Mazda", model: "MX-5 Miata", year: 2019, generation: "ND", body: "Roadster" } },
  { name: "Toyota Supra", chassis: "A80", years: "1993–2002",
    vehicle: { make: "Toyota", model: "Supra", year: 1997, generation: "A80 (Mk4)", body: "Coupe" } },
  { name: "BMW M3", chassis: "E46", years: "2000–2006",
    vehicle: { make: "BMW", model: "M3", year: 2003, generation: "E46", body: "Coupe" } },
  { name: "Nissan GT-R", chassis: "R35", years: "2007–now",
    vehicle: { make: "Nissan", model: "GT-R", year: 2017, generation: "R35", body: "Coupe" } },
];

const QUESTION_START =
  /^(is|are|was|were|do|does|did|should|would|could|can|will|which|what|whats|how|why|who|whose)\b/;
function looksLikeQuestion(q) {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return s.includes("?") || QUESTION_START.test(s) || s.split(/\s+/).length >= 4;
}

// Search-first landing (design ref #2b). One hero search bar that live-filters the
// catalog; a question-shaped query routes to Ask Garage AI instead. Empty state
// shows the four launch cars; a "research any car" fallback runs the profile
// engine on a make/model/year the catalog doesn't hold.
export default function Landing({ onSelect, onCompare, inCompare }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showResearch, setShowResearch] = useState(false);
  const [free, setFree] = useState({ make: "", model: "", year: "" });

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const needle = query.trim().toLowerCase();
  const results = !needle
    ? []
    : (catalog || []).filter((c) =>
        `${c.make} ${c.model} ${c.generation} ${c.body} ${c.note}`.toLowerCase().includes(needle),
      );

  const onSubmit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || asking) return;
    if (looksLikeQuestion(q)) {
      setNotice(null);
      setAsking(true);
      try {
        const data = await askAnswer(q);
        if (data.vehicle) onSelect(data.vehicle, data);
        else setNotice({ kind: "info", text: data.answer });
      } catch (err) {
        setNotice({ kind: "error", text: err.message });
      } finally {
        setAsking(false);
      }
    }
    // model/keyword queries are already reflected live in the results grid below
  };

  const submitFree = (e) => {
    e.preventDefault();
    if (free.make && free.model && free.year) onSelect({ ...free });
  };

  return (
    <div>
      {/* Hero */}
      <section
        className="marble-veins relative overflow-hidden px-6 pb-10 pt-16 text-center"
        style={{ background: "radial-gradient(120% 90% at 50% -20%, #1a1a1e, #0d0d0f 62%)" }}
      >
        <div className="relative mx-auto max-w-[760px]">
          <Mono className="text-[12px] tracking-[0.14em] !text-marble-accent">
            SEARCH ANY CAR · EXPLORE IN 3D
          </Mono>
          <h1 className="mt-3 text-[44px] font-extrabold leading-[1.02] tracking-[-0.02em] text-marble-hi sm:text-[52px]">
            Your pocket mechanic.
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-marble-mid">
            Search a make, model or trim — get the specs, the 3D teardown, and honest
            answers grounded in real data.
          </p>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-7 flex max-w-[620px] items-center gap-2 rounded-xl border border-white/[0.12] bg-marble-panel2 py-[7px] pl-[18px] pr-[7px] shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-marble-dim" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              id="hero-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any car — make, model, trim…"
              className="w-full bg-transparent text-[15px] text-marble-hi placeholder-marble-dim focus:outline-none"
            />
            <PrimaryButton type="submit" className="shrink-0 rounded-lg px-5 py-2.5 text-[13px]" disabled={asking}>
              {asking ? "…" : "Explore"}
            </PrimaryButton>
          </form>

          <p className="mt-3 text-[12.5px] text-marble-dim">
            Not in our profiled set?{" "}
            <button
              onClick={() => setShowResearch((s) => !s)}
              className="text-marble-accent hover:underline"
            >
              Research any car →
            </button>
          </p>

          {showResearch && (
            <form onSubmit={submitFree} className="mx-auto mt-3 flex max-w-[620px] flex-wrap items-center justify-center gap-2">
              {["make", "model", "year"].map((f) => (
                <input
                  key={f}
                  value={free[f]}
                  onChange={(e) => setFree({ ...free, [f]: e.target.value })}
                  placeholder={f[0].toUpperCase() + f.slice(1)}
                  inputMode={f === "year" ? "numeric" : "text"}
                  className="w-28 rounded-lg border border-white/10 bg-marble-panel px-3 py-1.5 text-sm text-marble-body placeholder-marble-dim focus:border-marble-accent focus:outline-none"
                />
              ))}
              <PrimaryButton type="submit" className="px-3 py-1.5 text-sm">Research</PrimaryButton>
            </form>
          )}

          {asking && <div className="mt-5 flex justify-center"><Spinner label="Garage AI is reading the data…" /></div>}
          {notice && (
            <div className={`mx-auto mt-5 max-w-[620px] rounded-xl border p-4 text-left text-sm ${
              notice.kind === "error"
                ? "border-red-500/30 bg-red-500/5 text-red-200"
                : "border-marble-accent/30 bg-marble-accent/5 text-marble-body"
            }`}>
              {notice.text}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        {needle ? (
          /* Live search results */
          <div className="pb-16 pt-2">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-marble-dim">
                {results.length} match{results.length === 1 ? "" : "es"} for “{query.trim()}”
              </p>
              <button onClick={() => setQuery("")} className="text-sm text-marble-dim hover:text-marble-accent">
                ← Clear
              </button>
            </div>
            {!catalog ? (
              <Spinner label="Loading catalog…" />
            ) : results.length === 0 && looksLikeQuestion(query) ? (
              <p className="text-sm text-marble-mid">
                Looking for an answer, not a listing? Press <span className="text-marble-accent">Explore</span> to ask Garage AI.
              </p>
            ) : (
              <CatalogGrid cars={results} onSelect={onSelect} onCompare={onCompare} inCompare={inCompare} />
            )}
          </div>
        ) : (
          /* Launch cars row */
          <div className="pb-16 pt-2">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-marble-hi">Launch cars — showcase quality</h2>
              <Mono className="text-[11px] normal-case tracking-normal">
                4 of 71 profiled · {catalog?.length ?? "…"} in catalog
              </Mono>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {LAUNCH.map((car) => (
                <LaunchCard key={car.name} car={car} onOpen={() => onSelect(car.vehicle)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchCard({ car, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group relative overflow-hidden rounded-[11px] border border-marble-accent/30 bg-marble-panel text-left transition hover:border-marble-accent/60"
    >
      <span className="absolute right-2 top-2 z-10 rounded-[4px] bg-marble-accent px-1.5 py-0.5 font-mono text-[9px] font-semibold text-marble-onaccent">
        3D READY
      </span>
      <div
        className="flex h-[104px] items-center justify-center"
        style={{ background: "radial-gradient(90% 90% at 50% 40%, #232327, #0c0c0e 74%)" }}
      >
        {/* small car silhouette stand-in (production: r3f thumbnail) */}
        <svg viewBox="0 0 120 40" className="h-9 w-28 text-marble-faint" fill="currentColor">
          <path d="M6 30c0-3 3-5 8-6l10-8c3-2 7-3 12-3h20c8 0 15 3 22 7l16 2c6 1 10 3 12 6 1 3-1 5-5 5H11c-3 0-5-2-5-4z" />
          <circle cx="34" cy="31" r="7" className="text-marble-bg" fill="currentColor" />
          <circle cx="88" cy="31" r="7" className="text-marble-bg" fill="currentColor" />
        </svg>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-[14px] font-semibold text-marble-hi">{car.name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-marble-accent">
          {car.chassis} · {car.years}
        </div>
      </div>
    </button>
  );
}
