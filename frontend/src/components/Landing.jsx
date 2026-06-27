import { useEffect, useMemo, useState } from "react";
import { getCatalog } from "../lib/api";
import { Card, Spinner } from "./ui";

// Search-first landing: a big search that filters the enthusiast catalog, plus a
// fallback "research any car" form for vehicles not in the catalog. Selecting a
// car hands a { make, model, year, ... } up to App, which opens the Vehicle Hub.
export default function Landing({ onSelect }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [free, setFree] = useState({ make: "", model: "", year: "" });

  useEffect(() => {
    getCatalog()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const results = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) =>
      `${c.make} ${c.model} ${c.generation} ${c.body} ${c.note}`
        .toLowerCase()
        .includes(q),
    );
  }, [catalog, query]);

  const submitFree = (e) => {
    e.preventDefault();
    if (free.make && free.model && free.year) onSelect({ ...free });
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="pt-16 pb-10 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Explore <span className="text-amber-500">any car</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Search a make, model, or trim — get real specs, reliability, recalls, and an
          interactive 3D breakdown.
        </p>

        <div className="mx-auto mt-7 max-w-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search… (e.g. Supra, M3, GT-R, rotary)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <form
          onSubmit={submitFree}
          className="mx-auto mt-3 flex max-w-xl flex-wrap items-center justify-center gap-2 text-sm text-zinc-500"
        >
          <span>Not listed?</span>
          <input
            value={free.make}
            onChange={(e) => setFree({ ...free, make: e.target.value })}
            placeholder="Make"
            className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200 focus:border-amber-500 focus:outline-none"
          />
          <input
            value={free.model}
            onChange={(e) => setFree({ ...free, model: e.target.value })}
            placeholder="Model"
            className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200 focus:border-amber-500 focus:outline-none"
          />
          <input
            value={free.year}
            onChange={(e) => setFree({ ...free, year: e.target.value })}
            placeholder="Year"
            inputMode="numeric"
            className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200 focus:border-amber-500 focus:outline-none"
          />
          <button className="rounded-lg bg-amber-500 px-3 py-1 font-semibold text-zinc-900 hover:bg-amber-400">
            Research
          </button>
        </form>
      </header>

      {!catalog ? (
        <Spinner label="Loading catalog…" />
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500">{results.length} vehicles</p>
          <div className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c, i) => (
              <button key={i} onClick={() => onSelect(c)} className="text-left">
                <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:border-amber-500">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-zinc-100">
                      {c.make} {c.model}
                    </h2>
                    <span className="shrink-0 text-xs text-zinc-500">{c.body}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-amber-500/90">{c.generation}</p>
                  <p className="mt-1 text-sm text-zinc-400">{c.note}</p>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
