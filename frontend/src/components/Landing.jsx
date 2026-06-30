import { useEffect, useState } from "react";
import { getCatalog, askAnswer } from "../lib/api";
import { Spinner } from "./ui";
import CatalogGrid from "./CatalogGrid";

// Example queries shown as chips under the bar, so visitors see it takes
// questions, not just model names. Each one runs as if typed.
const EXAMPLES = [
  "Mk4 Supra",
  "is the E46 M3 reliable?",
  "what breaks on the GT-R?",
  "is the Miata cheap to own?",
];

// A query is treated as a QUESTION (-> AI answer) rather than a model lookup when
// it has a question mark, opens with a question word, or runs long enough to read
// like a sentence. Otherwise it's a keyword and we just filter the catalog.
const QUESTION_START =
  /^(is|are|was|were|do|does|did|should|would|could|can|will|which|what|whats|how|why|who|whose)\b/;
function looksLikeQuestion(q) {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return s.includes("?") || QUESTION_START.test(s) || s.split(/\s+/).length >= 4;
}

// Search-first landing (Task 6): the homepage is just the search bar + example
// chips. Submitting a model name filters the catalog into a results grid; asking
// a question routes to the AI answer layer, which identifies the car and hands
// { vehicle, answer, ... } up so the Hub renders the answer on top of the car.
// "Browse all" reveals the full grid; the grid itself lives in CatalogGrid.
export default function Landing({ onSelect }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("home"); // home | results | browse
  const [results, setResults] = useState([]); // catalog filtered by the submitted keyword
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState(null); // inline reply (no car identified) or error
  const [free, setFree] = useState({ make: "", model: "", year: "" });

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const filterCatalog = (q) => {
    const needle = q.trim().toLowerCase();
    if (!catalog) return [];
    if (!needle) return catalog;
    return catalog.filter((c) =>
      `${c.make} ${c.model} ${c.generation} ${c.body} ${c.note}`
        .toLowerCase()
        .includes(needle),
    );
  };

  const run = async (raw) => {
    const q = raw.trim();
    if (!q || asking) return;
    setNotice(null);
    if (looksLikeQuestion(q)) {
      setAsking(true);
      try {
        const data = await askAnswer(q);
        if (data.vehicle) {
          onSelect(data.vehicle, data); // hand the answer up to App -> VehicleHub
        } else {
          setNotice({ kind: "info", text: data.answer }); // "name a car" reply
        }
      } catch (e) {
        setNotice({ kind: "error", text: e.message });
      } finally {
        setAsking(false);
      }
    } else {
      setResults(filterCatalog(q));
      setView("results");
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    run(query);
  };

  const runExample = (ex) => {
    setQuery(ex);
    run(ex);
  };

  const submitFree = (e) => {
    e.preventDefault();
    if (free.make && free.model && free.year) onSelect({ ...free });
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="pt-16 pb-10 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Ask about <span className="text-amber-500">any car</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Type a model to open it, or ask a question — Garage AI answers from real
          specs, reliability, and recall data.
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-7 flex max-w-xl gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a model, or ask… (e.g. is the Mk4 Supra reliable?)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            disabled={asking}
            className="shrink-0 rounded-xl bg-amber-500 px-5 font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {asking ? "…" : "Search"}
          </button>
        </form>

        <div className="mx-auto mt-3 flex max-w-xl flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => runExample(ex)}
              disabled={asking}
              className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>

        {asking && (
          <div className="mx-auto mt-6 max-w-xl">
            <Spinner label="Garage AI is reading the data…" />
          </div>
        )}

        {notice && (
          <div
            className={`mx-auto mt-6 max-w-xl rounded-xl border p-4 text-left text-sm ${
              notice.kind === "error"
                ? "border-red-500/30 bg-red-500/5 text-red-200"
                : "border-amber-500/30 bg-amber-500/5 text-zinc-200"
            }`}
          >
            {notice.text}
          </div>
        )}
      </header>

      {/* Results (keyword) or full browse grid; the bare homepage shows neither. */}
      {view !== "home" && (
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {view === "browse"
                ? `Browsing all ${catalog?.length ?? ""} vehicles`
                : `${results.length} match${results.length === 1 ? "" : "es"} for “${query.trim()}”`}
            </p>
            <button
              onClick={() => {
                setView("home");
                setNotice(null);
              }}
              className="shrink-0 text-sm text-zinc-400 hover:text-amber-400"
            >
              ← Back to search
            </button>
          </div>
          {!catalog ? (
            <Spinner label="Loading catalog…" />
          ) : (
            <CatalogGrid cars={view === "browse" ? catalog : results} onSelect={onSelect} />
          )}
        </div>
      )}

      {/* Bare-homepage extras: browse-all entry + the "not in the garage?" form. */}
      {view === "home" && !asking && (
        <div className="mx-auto max-w-xl pb-20 text-center">
          <button
            onClick={() => setView("browse")}
            className="text-sm text-zinc-400 underline-offset-4 hover:text-amber-400 hover:underline"
          >
            Browse all {catalog?.length ?? ""} vehicles
          </button>

          <form
            onSubmit={submitFree}
            className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500"
          >
            <span>Not in the garage?</span>
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
        </div>
      )}
    </div>
  );
}
