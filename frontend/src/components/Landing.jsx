import { useEffect, useState } from "react";
import { getCatalog, askAnswer } from "../lib/api";
import { Card, Spinner } from "./ui";
import CatalogGrid from "./CatalogGrid";

// Model-name chips for the catalog search engine (no AI) and question chips for
// the Ask Garage AI box (the grounded answer endpoint). Kept apart so each tool
// advertises what it does.
const SEARCH_EXAMPLES = ["Supra", "M3", "GT-R", "Miata", "911"];
const ASK_EXAMPLES = [
  "is the E46 M3 reliable?",
  "what breaks on the GT-R?",
  "is the Miata cheap to own?",
];

// Used only to nudge — if a catalog search comes up empty and the text reads like
// a question, we point the visitor at the Ask box instead of leaving them stuck.
const QUESTION_START =
  /^(is|are|was|were|do|does|did|should|would|could|can|will|which|what|whats|how|why|who|whose)\b/;
function looksLikeQuestion(q) {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return s.includes("?") || QUESTION_START.test(s) || s.split(/\s+/).length >= 4;
}

// Search-first landing, now with two clearly separate tools (owner request):
//   1. A catalog SEARCH ENGINE — filters the cars we have, entirely client-side,
//      no AI, no cost. Submitting a model/keyword opens a results grid.
//   2. An ASK GARAGE AI section — sends a question to /api/answer, which
//      identifies the car and answers grounded in our data + NHTSA. A resolved
//      car hands { vehicle, answer } up so the Hub renders the answer on top.
// The grid (results / browse-all) lives in CatalogGrid; the AI answer navigates
// away to the Hub, so only its "name a car" reply / errors show inline here.
export default function Landing({ onSelect, onCompare, inCompare }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState(""); // catalog search text
  const [question, setQuestion] = useState(""); // AI question text
  const [view, setView] = useState("home"); // home | results | browse
  const [results, setResults] = useState([]); // catalog filtered by the submitted keyword
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState(null); // AI inline reply (no car identified) or error

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

  // --- Tool 1: catalog search engine (no AI) ---
  const search = (term) => {
    const q = term.trim();
    if (!q) return;
    setResults(filterCatalog(q));
    setView("results");
  };
  const onSearch = (e) => {
    e.preventDefault();
    search(query);
  };
  const runSearchExample = (ex) => {
    setQuery(ex);
    search(ex);
  };

  // --- Tool 2: Ask Garage AI (the grounded answer endpoint) ---
  const ask = async (raw) => {
    const q = raw.trim();
    if (!q || asking) return;
    setNotice(null);
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
  };
  const onAsk = (e) => {
    e.preventDefault();
    ask(question);
  };
  const runAskExample = (ex) => {
    setQuestion(ex);
    ask(ex);
  };

  const submitFree = (e) => {
    e.preventDefault();
    if (free.make && free.model && free.year) onSelect({ ...free });
  };

  const chip =
    "rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-sm text-zinc-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-60";

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="pt-16 pb-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Find your <span className="text-amber-500">car</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Search the garage for a model, or ask Garage AI a question — answered from
          real specs, reliability, and recall data.
        </p>
      </header>

      {/* Tool 1 — the catalog search engine (filters our cars, no AI). */}
      <section className="mx-auto max-w-xl">
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the garage — model or keyword (e.g. Supra, M3, AWD)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button className="shrink-0 rounded-xl bg-amber-500 px-5 font-semibold text-zinc-900 hover:bg-amber-400">
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {SEARCH_EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => runSearchExample(ex)} className={chip}>
              {ex}
            </button>
          ))}
          <button
            onClick={() => setView("browse")}
            className="text-sm text-zinc-400 underline-offset-4 hover:text-amber-400 hover:underline"
          >
            Browse all {catalog?.length ?? ""}
          </button>
        </div>
      </section>

      {/* Tool 2 — Ask Garage AI (a separate section; hits /api/answer). */}
      <section className="mx-auto mt-10 max-w-xl">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Ask Garage AI
          </span>
          <p className="mt-1 text-sm text-zinc-400">
            Have a question about a specific car? Get a grounded answer, not just a
            listing.
          </p>
          <form onSubmit={onAsk} className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. is the Mk4 Supra reliable?"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              disabled={asking}
              className="shrink-0 rounded-xl bg-amber-500 px-5 font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
            >
              {asking ? "…" : "Ask"}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {ASK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => runAskExample(ex)}
                disabled={asking}
                className={chip}
              >
                {ex}
              </button>
            ))}
          </div>

          {asking && (
            <div className="mt-4">
              <Spinner label="Garage AI is reading the data…" />
            </div>
          )}
          {notice && (
            <div
              className={`mt-4 rounded-xl border p-4 text-left text-sm ${
                notice.kind === "error"
                  ? "border-red-500/30 bg-red-500/5 text-red-200"
                  : "border-amber-500/30 bg-amber-500/5 text-zinc-200"
              }`}
            >
              {notice.text}
            </div>
          )}
        </Card>
      </section>

      {/* Results / browse grid — driven only by the search engine above. */}
      {view !== "home" && (
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {view === "browse"
                ? `Browsing all ${catalog?.length ?? ""} vehicles`
                : `${results.length} match${results.length === 1 ? "" : "es"} for “${query.trim()}”`}
            </p>
            <button
              onClick={() => setView("home")}
              className="shrink-0 text-sm text-zinc-400 hover:text-amber-400"
            >
              ← Clear
            </button>
          </div>
          {/* Empty search that reads like a question -> point at the Ask box. */}
          {view === "results" && results.length === 0 && looksLikeQuestion(query) && (
            <p className="mb-4 text-sm text-zinc-400">
              Looking for an answer, not a listing? Ask it in the{" "}
              <span className="text-amber-400">Ask Garage AI</span> box above.
            </p>
          )}
          {!catalog ? (
            <Spinner label="Loading catalog…" />
          ) : (
            <CatalogGrid
              cars={view === "browse" ? catalog : results}
              onSelect={onSelect}
              onCompare={onCompare}
              inCompare={inCompare}
            />
          )}
        </div>
      )}

      {/* "Not in the garage?" — research any car by make/model/year. */}
      {view === "home" && (
        <div className="mx-auto mt-12 max-w-xl pb-20 text-center">
          <form
            onSubmit={submitFree}
            className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500"
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
