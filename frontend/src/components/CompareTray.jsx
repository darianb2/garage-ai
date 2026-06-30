// The persistent compare tray (Task 8). Sits fixed at the bottom once the visitor
// has staged at least one car; shows the staged cars as removable chips and a
// "Compare" button that opens the side-by-side view (enabled at two or more).
export default function CompareTray({ items, max, onRemove, onClear, onCompare }) {
  if (items.length === 0) return null;
  const ready = items.length >= 2;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
          Compare ({items.length}/{max})
        </span>

        <div className="flex flex-1 flex-wrap gap-2">
          {items.map((v) => (
            <span
              key={`${v.make}-${v.model}-${v.generation || ""}-${v.year}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
            >
              {v.year} {v.model}
              <button
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v.model}`}
                className="text-zinc-500 hover:text-red-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <button onClick={onClear} className="text-sm text-zinc-500 hover:text-zinc-300">
          Clear
        </button>
        <button
          onClick={onCompare}
          disabled={!ready}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ready ? "Compare" : "Add one more"}
        </button>
      </div>
    </div>
  );
}
