import { useEffect, useRef, useState } from "react";
import { getCatalog } from "../lib/api";

// Compact search that lives in the top nav, shown only while the user is on a
// vehicle (a "file") — see App.jsx. Filters the catalog client-side on the same
// fields as the Landing search, and hands the picked car up via onSelect to open
// its Hub. Keyboard (↑/↓/Enter/Esc), pointer, and outside-click aware.
export default function TopSearch({ onSelect }) {
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    getCatalog()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  // Close the dropdown when clicking anywhere outside the box.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowList(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const needle = query.trim().toLowerCase();
  const matches = !needle
    ? []
    : catalog
        .filter((c) =>
          `${c.make} ${c.model} ${c.generation} ${c.body} ${c.note}`
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 8);

  const pick = (c) => {
    setQuery("");
    setShowList(false);
    onSelect({ ...c });
  };

  const onKeyDown = (e) => {
    if (!showList || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setShowList(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xs sm:max-w-sm">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowList(true);
          setActive(0);
        }}
        onFocus={() => needle && setShowList(true)}
        onKeyDown={onKeyDown}
        placeholder="Search cars…"
        aria-label="Search cars"
        role="combobox"
        aria-expanded={showList && !!needle}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-marble-accent focus:outline-none focus:ring-1 focus:ring-marble-accent"
      />
      {showList && needle && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>
          ) : (
            matches.map((c, i) => (
              <li key={`${c.make}-${c.model}-${c.year}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c)}
                  className={`block w-full px-3 py-2 text-left ${
                    i === active ? "bg-marble-accent text-zinc-900" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-sm font-medium">
                    {c.make} {c.model}
                  </span>
                  <span
                    className={`ml-1 text-xs ${i === active ? "text-zinc-800" : "text-zinc-500"}`}
                  >
                    {c.year}
                    {c.generation ? ` · ${c.generation}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
