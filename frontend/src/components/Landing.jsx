import { useEffect, useMemo, useState } from "react";
import { getCatalog } from "../lib/api";
import { Card, Spinner, SectionTitle } from "./ui";

// Models we collapse into a single expandable tile because we carry many
// generations of them. Everything else stays one tile per generation.
const GROUPED = new Set(["Honda Civic Si"]);

// Search-first landing: a big search that filters the enthusiast catalog, plus a
// fallback "research any car" form for vehicles not in the catalog. Selecting a
// car hands a { make, model, year, ... } up to App, which opens the Vehicle Hub.
export default function Landing({ onSelect }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [free, setFree] = useState({ make: "", model: "", year: "" });
  // Which grouped model tile is expanded (keyed by "make model"), or null.
  const [openGroup, setOpenGroup] = useState(null);

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

  // Turn the flat results into tiles: grouped models collapse into one
  // expandable tile (inserted where their first generation appears, so grid
  // order is preserved); every other vehicle is its own tile.
  const tiles = useMemo(() => {
    const out = [];
    const groups = new Map();
    for (const c of results) {
      const key = `${c.make} ${c.model}`;
      if (GROUPED.has(key)) {
        let g = groups.get(key);
        if (!g) {
          g = { type: "group", key, make: c.make, model: c.model, items: [] };
          groups.set(key, g);
          out.push(g);
        }
        g.items.push(c);
      } else {
        out.push({ type: "car", car: c });
      }
    }
    return out;
  }, [results]);

  // Group the tiles by brand (make), with brands A→Z and each brand's tiles
  // sorted alphabetically by model (then generation) so everything is ordered.
  const brands = useMemo(() => {
    const label = (t) =>
      t.type === "car" ? `${t.car.model} ${t.car.generation}` : t.model;
    const byMake = new Map();
    for (const t of tiles) {
      const make = t.type === "car" ? t.car.make : t.make;
      if (!byMake.has(make)) byMake.set(make, []);
      byMake.get(make).push(t);
    }
    return [...byMake.entries()]
      .map(([name, ts]) => ({
        name,
        tiles: ts.sort((a, b) => label(a).localeCompare(label(b))),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tiles]);

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
      ) : brands.length === 0 ? (
        <p className="pb-16 text-zinc-400">No vehicles match your search.</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-zinc-500">{results.length} vehicles</p>
          <div className="space-y-10 pb-16">
            {brands.map((brand) => (
              <section key={brand.name}>
                <SectionTitle>{brand.name}</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {brand.tiles.map((t) =>
                    t.type === "car" ? (
                      <button
                        key={`${t.car.model}-${t.car.generation}-${t.car.year}`}
                        onClick={() => onSelect(t.car)}
                        className="text-left"
                      >
                        <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:border-amber-500">
                          <div className="flex items-baseline justify-between gap-2">
                            <h2 className="font-semibold text-zinc-100">{t.car.model}</h2>
                            <span className="shrink-0 text-xs text-zinc-500">{t.car.body}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-amber-500/90">{t.car.generation}</p>
                          <p className="mt-1 text-sm text-zinc-400">{t.car.note}</p>
                        </Card>
                      </button>
                    ) : (
                      <GroupTile
                        key={t.key}
                        group={t}
                        open={openGroup === t.key}
                        onToggle={() => setOpenGroup(openGroup === t.key ? null : t.key)}
                        onSelect={onSelect}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// A collapsed model tile that expands to list its generations. Collapsed, it
// reads like a normal card; expanded, it spans the row and each generation is a
// tappable card that opens that specific vehicle in the Hub.
function GroupTile({ group, open, onToggle, onSelect }) {
  const { model, items } = group;
  const count = items.length;
  return (
    <div className={open ? "sm:col-span-2 lg:col-span-3" : ""}>
      <Card className="h-full p-4 transition hover:border-amber-500">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div>
            <h2 className="font-semibold text-zinc-100">{model}</h2>
            <p className="mt-0.5 text-sm text-amber-500/90">
              {count} generation{count === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {items[0].generation} → {items[count - 1].generation}
            </p>
          </div>
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul className="mt-3 grid gap-2 border-t border-zinc-800 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g, j) => (
              <li key={j}>
                <button
                  onClick={() => onSelect(g)}
                  className="h-full w-full rounded-lg border border-zinc-800 p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-500"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-amber-500/90">
                      {g.generation}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{g.body}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{g.note}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
