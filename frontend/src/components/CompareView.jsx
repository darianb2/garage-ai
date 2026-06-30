import { useEffect, useState } from "react";
import { getProfile, compareCars } from "../lib/api";
import { Card, Spinner } from "./ui";
import CarImage from "./CarImage";

// Rows of the side-by-side table. `get` pulls the display value out of a profile;
// `num` (optional) pulls a comparable number and `better` ("max"/"min") marks the
// standout value for a light amber highlight — only where "better" is unambiguous
// (more power, fewer recalls). Cars without a curated spec sheet just show "—" for
// the spec rows; their NHTSA reliability rows still fill in.
const SPEC_ROWS = [
  { label: "Engine", get: (p) => p.specs?.engine },
  {
    label: "Horsepower",
    get: (p) => (p.specs?.horsepower != null ? `${p.specs.horsepower} hp` : null),
    num: (p) => p.specs?.horsepower,
    better: "max",
  },
  { label: "Torque", get: (p) => p.specs?.torque },
  { label: "Drivetrain", get: (p) => p.specs?.drivetrain },
  { label: "Transmission", get: (p) => p.specs?.transmission },
  { label: "0-60", get: (p) => p.specs?.["0_to_60"] },
  { label: "Curb weight", get: (p) => p.specs?.curb_weight },
  { label: "Fuel economy", get: (p) => p.specs?.fuel_economy },
];

const SIGNAL_ROWS = [
  { label: "Reliability", get: (p) => p.reliability?.label },
  {
    label: "Recalls",
    get: (p) => p.reliability?.recalls ?? 0,
    num: (p) => p.reliability?.recalls,
    better: "min",
  },
  {
    label: "Complaints",
    get: (p) => p.reliability?.complaints ?? 0,
    num: (p) => p.reliability?.complaints,
    better: "min",
  },
  {
    label: "Crash/fire/injury",
    get: (p) => p.reliability?.serious ?? 0,
    num: (p) => p.reliability?.serious,
    better: "min",
  },
];

// Which column(s) hold the standout value for a row — empty unless at least two
// cars give a comparable number and they aren't all equal.
function winners(profiles, row) {
  if (!row.better || !row.num) return new Set();
  const vals = profiles.map((r) => (r.profile ? row.num(r.profile) : undefined));
  const defined = vals.filter((v) => typeof v === "number");
  if (defined.length < 2) return new Set();
  const target = row.better === "max" ? Math.max(...defined) : Math.min(...defined);
  if (defined.every((v) => v === target)) return new Set(); // all tied -> no winner
  const set = new Set();
  vals.forEach((v, i) => v === target && set.add(i));
  return set;
}

function Cell({ row, entry, win }) {
  const value = entry.profile ? row.get(entry.profile) : null;
  const blank = value === null || value === undefined || value === "";
  return (
    <td className={`px-3 py-2 align-top text-sm ${win ? "font-semibold text-amber-300" : "text-zinc-200"}`}>
      {blank ? <span className="text-zinc-600">—</span> : value}
    </td>
  );
}

function Section({ title, rows, profiles }) {
  return (
    <>
      <tr>
        <td
          colSpan={profiles.length + 1}
          className="pt-5 pb-1 text-xs font-semibold uppercase tracking-wide text-amber-500"
        >
          {title}
        </td>
      </tr>
      {rows.map((row) => {
        const win = winners(profiles, row);
        return (
          <tr key={row.label} className="border-t border-zinc-800">
            <th className="w-36 py-2 pr-4 text-left align-top text-xs font-medium uppercase tracking-wide text-zinc-500">
              {row.label}
            </th>
            {profiles.map((entry, i) => (
              <Cell key={i} row={row} entry={entry} win={win.has(i)} />
            ))}
          </tr>
        );
      })}
    </>
  );
}

// The side-by-side compare view (Task 8). Pulls each staged car's profile in
// parallel — the same data the Hub shows, so the table is free and instant — and
// lays the cars out column by column, aligned row by row. The AI "key differences"
// summary on top is the only billed part (and it's cached + rate-limited server
// side). Removing cars down to one bounces back with a prompt to add another.
export default function CompareView({ vehicles, onBack, onOpen, onRemove }) {
  const [profiles, setProfiles] = useState(null); // [{ profile } | { error }] aligned to vehicles
  const [summary, setSummary] = useState(null); // { summary, sources } | { error }
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Fetch every car's profile in parallel. Each entry is tagged so one car's NHTSA
  // hiccup doesn't blank the whole table.
  useEffect(() => {
    if (vehicles.length < 2) return;
    let active = true;
    setProfiles(null);
    Promise.all(
      vehicles.map((v) =>
        getProfile(v)
          .then((p) => ({ profile: p }))
          .catch((e) => ({ error: e.message })),
      ),
    ).then((rows) => active && setProfiles(rows));
    return () => {
      active = false;
    };
  }, [vehicles]);

  // The optional AI layer, loaded independently so the table never waits on it.
  useEffect(() => {
    if (vehicles.length < 2) return;
    let active = true;
    setSummary(null);
    setSummaryLoading(true);
    compareCars(vehicles)
      .then((d) => active && setSummary(d))
      .catch((e) => active && setSummary({ error: e.message }))
      .finally(() => active && setSummaryLoading(false));
    return () => {
      active = false;
    };
  }, [vehicles]);

  const anyMissingSpecs =
    profiles?.some((entry) => entry.profile && !entry.profile.specs) ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={onBack} className="text-sm text-zinc-400 hover:text-amber-400">
        ← Back
      </button>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Compare</h1>

      {vehicles.length < 2 ? (
        <p className="mt-6 text-zinc-400">
          Add another car to compare — pick a second from a car page or the catalog.
        </p>
      ) : (
        <>
          {/* AI "key differences" readout (optional layer). */}
          <section className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-500">
              Garage AI · key differences
            </div>
            {summaryLoading ? (
              <div className="mt-3">
                <Spinner label="Reading both cars' data…" />
              </div>
            ) : summary?.error ? (
              <p className="mt-3 text-sm text-zinc-400">
                Couldn't generate a summary right now ({summary.error}). The spec
                comparison below still works.
              </p>
            ) : summary ? (
              <>
                <div className="mt-3 whitespace-pre-line leading-relaxed text-zinc-100">
                  {summary.summary}
                </div>
                {summary.sources?.length > 0 && (
                  <p className="mt-4 border-t border-amber-500/10 pt-3 text-xs text-zinc-500">
                    Based on: {summary.sources.join(" · ")}
                  </p>
                )}
              </>
            ) : null}
          </section>

          {/* The aligned spec table. */}
          <Card className="mt-4 overflow-x-auto p-5">
            {!profiles ? (
              <Spinner label="Pulling specs…" />
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-36" />
                    {vehicles.map((v, i) => (
                      <th key={i} className="px-3 pb-3 text-left align-bottom">
                        <CarImage vehicle={v} variant="tile" className="mb-2" />
                        <div className="text-sm font-bold text-zinc-100">
                          {v.year} {v.model}
                        </div>
                        <div className="text-xs text-amber-500/90">
                          {v.make}
                          {v.generation ? ` · ${v.generation}` : ""}
                        </div>
                        <div className="mt-1 flex gap-3 text-xs">
                          <button
                            onClick={() => onOpen(v)}
                            className="text-zinc-400 hover:text-amber-400"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => onRemove(v)}
                            className="text-zinc-500 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Section title="Specs" rows={SPEC_ROWS} profiles={profiles} />
                  <Section title="Reliability signal" rows={SIGNAL_ROWS} profiles={profiles} />
                </tbody>
              </table>
            )}
            {anyMissingSpecs && (
              <p className="mt-4 text-xs text-zinc-600">
                Detailed specs are only on file for our curated generations; NHTSA
                reliability data is shown for every car.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
