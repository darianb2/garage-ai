import { useMemo, useState } from "react";
import Viewer3D from "./Viewer3D";
import { explodeFor } from "../lib/explode";
import { Segmented, SectionLabel, Mono, PrimaryButton } from "./ui";

const VIEWS = [
  { id: "car", label: "On car" },
  { id: "bench", label: "Bench" },
];

// A minimal geometric part glyph (~20px). The handoff calls for a simple outline
// mark set; a uniform rounded square with a small inner tick reads cleanly and
// stays neutral until a real icon set is added.
function Glyph({ className = "" }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-marble-faint bg-[#26262b] ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-[1px] bg-marble-faint" />
    </span>
  );
}

// Vertical dashed cobalt connector tying a chip to its location on the car.
function Connector({ bright = false }) {
  return (
    <span
      className="mx-auto block h-[26px] w-px"
      style={{
        background: `repeating-linear-gradient(180deg, rgba(90,140,240,${bright ? 0.9 : 0.5}) 0 4px, transparent 4px 8px)`,
      }}
    />
  );
}

function Chip({ part, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
        selected
          ? "border-marble-accent bg-marble-accent/[0.12] ring-4 ring-marble-accent/15"
          : "border-white/10 bg-marble-panel2 hover:border-white/20"
      }`}
    >
      <Glyph />
      <span className="min-w-0 truncate">
        <span className={`text-[11.5px] ${selected ? "font-semibold text-marble-hi" : "text-marble-body"}`}>
          {part.chip}
        </span>
        {part.detail && <span className="ml-1 font-mono text-[10px] text-marble-dim">{part.detail}</span>}
      </span>
    </button>
  );
}

export default function ExplodeMode({ vehicle, model, profile }) {
  const data = useMemo(() => explodeFor(vehicle, profile), [vehicle, profile]);
  const [view, setView] = useState("car");
  const [selectedId, setSelectedId] = useState("muffler");
  const sel = data.parts[selectedId] || null;

  if (view === "bench") {
    return (
      <div className="overflow-hidden rounded-xl border border-white/[0.07]">
        <div className="marble-stage grid gap-6 p-5 lg:grid-cols-[330px_1fr]">
          {/* Left: car on the bench */}
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <svg viewBox="0 0 200 72" className="h-[100px] w-[240px] text-marble-faint/70" fill="currentColor">
              <path d="M10 52c0-5 5-9 14-11l18-14c5-4 12-5 20-5h34c14 0 26 5 38 12l28 4c10 2 17 5 20 11 2 5-2 9-9 9H18c-5 0-8-3-8-6z" />
              <circle cx="58" cy="54" r="12" className="text-marble-bg" fill="currentColor" />
              <circle cx="150" cy="54" r="12" className="text-marble-bg" fill="currentColor" />
            </svg>
            <p className="text-[12px] text-marble-dim">Your car, on the bench.<br />Parts laid out by system →</p>
            <Segmented items={VIEWS} value={view} onChange={setView} />
          </div>

          {/* Right: system grid */}
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {data.bench.map((grp) => (
              <div key={grp.group}>
                <SectionLabel className="!text-marble-accent">{grp.group}</SectionLabel>
                <div className="mt-2 space-y-1.5">
                  {grp.ids.map((id) => {
                    const p = data.parts[id];
                    const on = id === selectedId;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedId(id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                          on ? "border-marble-accent bg-marble-accent/10" : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-marble-body">{p.name}</span>
                          <span className={`font-mono text-[10px] ${on ? "text-marble-accent" : "text-marble-dim"}`}>
                            {p.replaceMi}
                          </span>
                        </div>
                        {on && p.sources && (
                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-marble-accent/25 pt-2">
                            <span className="text-[11px] text-marble-mid">
                              Best source · {p.sources.bestRated.vendor}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-[12px] font-bold text-marble-hi">${p.sources.bestRated.price}</span>
                              <span className="font-mono text-[11px] text-marble-accent">order →</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // On-car view
  return (
    <div className="grid overflow-hidden rounded-xl border border-white/[0.07] lg:grid-cols-[1fr_350px]">
      {/* Stage */}
      <div className="marble-stage relative flex min-h-[460px] flex-col p-4">
        <div className="flex items-center gap-3">
          <Segmented items={VIEWS} value={view} onChange={setView} />
          <Mono className="text-[10px] !text-marble-faint">8 SERVICEABLE SYSTEMS</Mono>
        </div>

        {/* Top band */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.onCar.top.map((id) => (
            <Chip key={id} part={data.parts[id]} selected={id === selectedId} onClick={() => setSelectedId(id)} />
          ))}
        </div>
        <div className="hidden grid-cols-4 sm:grid">
          {data.onCar.top.map((id) => <Connector key={id} bright={id === selectedId} />)}
        </div>

        {/* Car (dimmed) */}
        <div className="relative flex-1 opacity-[0.55]">
          <Viewer3D model={model} dark spin={false} />
        </div>

        <div className="hidden grid-cols-4 sm:grid">
          {data.onCar.bottom.map((id) => <Connector key={id} bright={id === selectedId} />)}
        </div>
        {/* Bottom band */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.onCar.bottom.map((id) => (
            <Chip key={id} part={data.parts[id]} selected={id === selectedId} onClick={() => setSelectedId(id)} />
          ))}
        </div>

        <p className="mt-3 text-center text-[12px] text-marble-dim">
          Every part the car will ask of you — tap one for mileage &amp; sources
        </p>
      </div>

      {/* Part card rail */}
      <div className="border-t border-white/[0.07] bg-marble-rail p-5 lg:border-l lg:border-t-0">
        {sel ? <PartCard part={sel} /> : <p className="text-sm text-marble-mid">Select a part.</p>}
      </div>
    </div>
  );
}

function PartCard({ part }) {
  const s = part.sources;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold text-marble-hi">{part.name}</h3>
        {part.oem && <Mono className="text-[10px] normal-case tracking-normal">OEM {part.oem}</Mono>}
      </div>

      <div className="mt-3 rounded-[9px] bg-marble-panel p-3.5">
        <SectionLabel>REPLACE</SectionLabel>
        <p className="mt-1.5 text-[13px] leading-relaxed text-marble-body">
          {(() => {
            // Bold the note's leading clause (the interval/condition); keep the rest normal.
            const i = part.note.indexOf(". ");
            if (i === -1) return part.note;
            return (
              <>
                <span className="font-semibold text-marble-hi">{part.note.slice(0, i + 1)}</span>{" "}
                {part.note.slice(i + 2)}
              </>
            );
          })()}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {part.badges.map((b) => (
            <span key={b} className="rounded-[4px] border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-marble-dim">
              {b}
            </span>
          ))}
        </div>
      </div>

      {s ? (
        <>
          <SectionLabel className="mt-4">SOURCES · COMPARED</SectionLabel>
          <div className="mt-2 space-y-1.5">
            {[s.cheapest, s.bestRated, s.trusted].map((row, i) => (
              <div
                key={i}
                className={`rounded-[9px] border px-3 py-2.5 ${
                  i === 0 ? "border-marble-accent/40 bg-marble-accent/[0.06]" : "border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[9.5px] ${i === 0 ? "text-marble-accent" : "text-marble-dim"}`}>
                    {row.tier}
                  </span>
                  <span className="text-[15px] font-bold text-marble-hi">${row.price}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[12px] text-marble-body">{row.vendor}</span>
                  <span className="text-[11px] text-marble-mid">{row.rating}</span>
                </div>
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-3 w-full">
            Order from {s.cheapest.vendor.split(" ")[0]} → ${s.cheapest.price}
          </PrimaryButton>
          <p className="mt-2 text-[10.5px] text-marble-dim">Prices checked live · we link out, we don't sell</p>
        </>
      ) : (
        <p className="mt-4 text-[12px] text-marble-dim">
          No listed aftermarket sources — this is an inspect/service item, not a swap-in part.
        </p>
      )}
    </div>
  );
}
