import { useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui";
import CarImage from "./CarImage";

// The brand-grouped catalog grid. Given an already-filtered list of catalog
// cars, lays them out by make A->Z. Any model with two or more generations in
// the list collapses into one expandable tile, so a many-generation car (M3,
// Civic Si, Corvette, Supra, ...) reads as a single entry instead of flooding
// the grid. Lifted out of Landing (Task 6) so the homepage stays a bare search
// bar and the grid can be reused by the Browse-all and results views.
export default function CatalogGrid({ cars, onSelect }) {
  const [openGroup, setOpenGroup] = useState(null);

  // Turn the flat list into tiles: any model that appears more than once
  // collapses into a single expandable tile (inserted where its first generation
  // appears, so order is preserved); a model with one generation stays its own
  // car tile. Whether a model groups depends on this list, so a search that
  // narrows to a single generation shows that generation directly.
  const tiles = useMemo(() => {
    const counts = new Map();
    for (const c of cars) {
      const key = `${c.make} ${c.model}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const out = [];
    const groups = new Map();
    for (const c of cars) {
      const key = `${c.make} ${c.model}`;
      if (counts.get(key) > 1) {
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
    // Order each group's generations oldest -> newest so the tile's range and
    // expanded list read chronologically.
    for (const g of groups.values()) {
      g.items.sort((a, b) => a.year - b.year);
    }
    return out;
  }, [cars]);

  // Group the tiles by brand (make), brands A->Z, each brand's tiles sorted by
  // model (then generation) so everything is ordered.
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

  if (brands.length === 0) {
    return <p className="pb-16 text-zinc-400">No vehicles match your search.</p>;
  }

  return (
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
                    <CarImage vehicle={t.car} variant="tile" className="mb-3" />
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
        <CarImage vehicle={items[0]} variant="tile" className="mb-3" />
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
