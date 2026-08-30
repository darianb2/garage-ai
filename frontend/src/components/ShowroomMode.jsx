import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Viewer3D from "./Stage3D";
import { configFor, paintHex } from "../lib/config";
import { partsFor, modDefaults } from "../lib/parts";
import { listingLinks, yearsLabel } from "../lib/listings";
import { modelSlugFor } from "../lib/models";
import { getBreakdown } from "../lib/api";
import { carSpecChips } from "../lib/teardown";
import { SectionLabel, Segmented, PrimaryButton, Mono } from "./ui";

// The Teardown (exploded-view) stage carries three.js + the procedural parts, so
// lazy-split it into the 3D chunk — it only mounts for cars that have a breakdown.
const TeardownStage = lazy(() => import("./teardown/TeardownStage"));

// Showroom mode (design ref #4a Showroom): the persistent 3D stage on the left +
// a configurator rail on the right. Package deltas sum into "as configured" live.
export default function ShowroomMode({ vehicle, model }) {
  const config = useMemo(() => configFor(vehicle), [vehicle]);
  const parts = useMemo(() => partsFor(vehicle), [vehicle]);

  // The model's original/factory colour (renders as authored — no paint override),
  // offered as the first swatch and the default so the car opens in its true colour
  // and painting it is an opt-in mod. Only present for cars we can recolour.
  // Palette-merged cars (Miata/M3) lock paint to "Original" — recolouring their one
  // merged body material tints the baked texture muddily (and would repaint the
  // wheels). paintLocked hides the swatch palette below; the car shows as authored.
  const stock = parts?.stockPaint || null;
  const paintLocked = !!parts?.paintLocked;
  const paintOptions = useMemo(
    () =>
      paintLocked
        ? stock
          ? [stock]
          : []
        : stock
        ? [stock, ...(config?.paint || [])]
        : config?.paint || [],
    [stock, config, paintLocked]
  );

  const [body, setBody] = useState(config?.defaults.body);
  const [paint, setPaint] = useState(stock?.id ?? config?.defaults.paint);
  const [trim, setTrim] = useState(config?.defaults.trim);
  const [packages, setPackages] = useState(config?.defaults.packages || []);

  const paintObj = paintOptions.find((p) => p.id === paint);
  const bodyObj = config?.body.find((b) => b.id === body);

  // M2 — bolt-on parts the car's GLB ships as separable meshes, toggled on/off.
  // Held as the full { id: boolean } map (not a set of "removed" ids) so the stage
  // never has to infer intent from a missing key. Re-seeded when the car changes,
  // since the ids are per-car and this component is not remounted between vehicles.
  const mods = parts?.mods ?? null;
  const [toggles, setToggles] = useState(() => modDefaults(parts));
  useEffect(() => setToggles(modDefaults(parts)), [parts]);
  const toggleMod = (id) => setToggles((cur) => ({ ...cur, [id]: !cur[id] }));

  // Which bolt-on the pointer is over ON THE CAR (the stage reports it up), and
  // which ones have been taken off. Removing a part leaves nothing to click, so the
  // chips below the stage are the way back — the rail checkboxes work too.
  const [hoverMod, setHoverMod] = useState(null);
  const hoverModLabel = hoverMod ? mods?.find((m) => m.id === hoverMod)?.label : null;

  // Which breakdown part the pointer is over on the car. Clicking it pops that one
  // part off (the stage owns the animation); this is only here to name it in the
  // caption, so hovering tells you what you're about to pull off.
  const [hoverPart, setHoverPart] = useState(null);
  // Hovering a SYSTEMS row highlights that part on the car, including parts with no
  // visible geometry at rest — the stage takes this as a second hover source.
  const [railHover, setRailHover] = useState(null);
  const removedMods = useMemo(() => (mods || []).filter((m) => !toggles[m.id]), [mods, toggles]);

  // "Find one for sale" — the summary CTA opens a short list of marketplace
  // searches for this generation. Outbound links only (no listing data is pulled
  // into Marble, which is what keeps it licence-free — see lib/listings.js).
  const [findOpen, setFindOpen] = useState(false);
  const marketplaces = useMemo(() => listingLinks(vehicle), [vehicle]);
  const years = yearsLabel(vehicle);
  useEffect(() => setFindOpen(false), [vehicle]);

  // Feed the current build into the 3D stage. partsFor tells us what each car
  // supports; cars with no entry pass nulls and render exactly as authored.
  // M1 paint: selecting the "Original" swatch (stock id) also passes null.
  // M2 toggles: partGroups maps a mod id → the mesh names it hides/shows.
  const stageConfig = useMemo(
    () => ({
      paint:
        parts?.paintTargets?.length && paint !== stock?.id ? paintHex(paintObj?.fill) : null,
      paintTargets: parts?.paintTargets ?? null,
      partGroups: parts?.partGroups ?? null,
      toggles,
    }),
    [parts, paintObj, paint, stock, toggles]
  );
  const total = config
    ? config.msrpBase +
      config.packages.filter((p) => packages.includes(p.id)).reduce((s, p) => s + p.price, 0)
    : 0;
  const togglePkg = (id) =>
    setPackages((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // ── Teardown (Honda-"Cog" exploded view) ──────────────────────────────────
  // Feature-detect per car: fetch this model's breakdown; a 404 (any car without
  // one) hides the Teardown button and keeps the plain stage. All seven launch
  // cars with a 3D model have a breakdown (data/breakdowns/<slug>.json).
  const slug = useMemo(() => modelSlugFor(vehicle), [vehicle]);
  const [breakdown, setBreakdown] = useState(null);
  const [tdError, setTdError] = useState(false);
  const [teardown, setTeardown] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modelReady, setModelReady] = useState(false);

  // Name the hovered part for the stage caption. Declared down here, not up with
  // `hoverPart`, because it reads `breakdown` — which is declared just above.
  const hoverPartName = hoverPart
    ? breakdown?.parts?.find((pt) => pt.id === hoverPart)?.label || null
    : null;
  const railHoverName = railHover
    ? breakdown?.parts?.find((pt) => pt.id === railHover)?.label || null
    : null;
  const teardownReady = breakdown && !tdError;
  const specChips = useMemo(() => carSpecChips(breakdown?.car_specs), [breakdown]);

  useEffect(() => {
    setBreakdown(null);
    setTdError(false);
    setTeardown(false);
    setSelectedId(null);
    setModelReady(false);
    if (!slug) {
      setTdError(true);
      return;
    }
    let active = true;
    getBreakdown(slug)
      .then((b) => active && setBreakdown(b))
      .catch(() => active && setTdError(true));
    return () => {
      active = false;
    };
  }, [slug]);

  // ESC steps out: deselect a part first, then exit teardown.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selectedId) setSelectedId(null);
      else if (teardown) setTeardown(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, teardown]);

  const selectPart = (id) => setSelectedId((cur) => (id == null ? null : cur === id ? null : id));
  const toggleTeardown = () => {
    setTeardown((t) => !t);
    setSelectedId(null);
  };

  return (
    <div className="grid overflow-hidden rounded-xl border border-white/[0.07] lg:grid-cols-[1fr_340px]">
      {/* Stage */}
      <div className="marble-stage relative min-h-[460px] overflow-hidden">
        {!teardown && (
          <div className="pointer-events-none absolute left-4 top-3 z-10">
            <Mono className="text-[10px] !text-marble-faint">
              SHOWROOM · {vehicle.year} {vehicle.model.toUpperCase()}
              {bodyObj ? ` · ${bodyObj.label.toUpperCase()}` : ""}
            </Mono>
          </div>
        )}
        {!teardown && (
          <div className="absolute right-4 top-3 z-10 flex gap-1.5">
            {["⟲ 360°", "⊕ zoom"].map((c) => (
              <span key={c} className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-marble-mid">
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="absolute inset-0">
          {teardownReady ? (
            <Suspense fallback={<StageLoading />}>
              <TeardownStage
                model={model}
                breakdown={breakdown}
                paint={stageConfig.paint}
                paintTargets={stageConfig.paintTargets}
                partGroups={stageConfig.partGroups}
                toggles={stageConfig.toggles}
                onModPick={toggleMod}
                onModHover={setHoverMod}
                onPartHover={setHoverPart}
                railHoverId={railHover}
                teardown={teardown}
                selectedId={selectedId}
                onSelect={selectPart}
                onReady={() => setModelReady(true)}
                onError={() => setTdError(true)}
              />
            </Suspense>
          ) : (
            <Viewer3D model={model} dark spin={false} config={stageConfig} />
          )}
        </div>

        {/* Spec strip (car_specs header) — teardown only */}
        {teardown && specChips.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-3.5 z-20 flex justify-center">
            <div className="td-fade-up flex max-w-[1040px] flex-wrap justify-center gap-1.5 px-4">
              {specChips.map((c) => (
                <span
                  key={c.k}
                  className="flex items-baseline gap-1.5 rounded-md border border-[#232328] bg-[#141416]/[0.82] px-2.5 py-1.5 backdrop-blur-sm"
                >
                  <span className="font-mono text-[9px] tracking-[.14em] text-marble-dim">{c.k}</span>
                  <span className="whitespace-nowrap text-[12px] font-medium text-marble-body">{c.v}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Teardown / Reassemble button */}
        {teardownReady && (
          <TeardownButton active={teardown} loading={!modelReady} onClick={toggleTeardown} />
        )}

        {/* Hint bar (torn down, nothing selected) */}
        {teardown && !selectedId && modelReady && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
            <span className="td-fade font-mono text-[10px] tracking-[.18em] text-marble-dim">
              HOVER A MARKER · CLICK FOR DETAILS · ESC TO EXIT
            </span>
          </div>
        )}

        {/* Removed bolt-ons — a hidden part has no geometry left to click, so this is
            the way back onto the car (the MODS checkboxes in the rail also work). */}
        {!teardown && removedMods.length > 0 && (
          <div className="absolute bottom-3 left-4 z-20 flex flex-wrap gap-1.5">
            {removedMods.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMod(m.id)}
                className="td-fade flex items-center gap-1.5 rounded-md border border-white/10 bg-[#141416]/85 px-2 py-1 text-[11px] text-marble-mid backdrop-blur-sm transition hover:border-marble-accent/40 hover:text-marble-body"
              >
                <span className="font-mono text-[9px] tracking-[.12em] text-marble-faint">OFF</span>
                {m.label}
                <span className="font-mono text-[10px] text-marble-accent">put back</span>
              </button>
            ))}
          </div>
        )}

        {/* Paint caption — hidden during teardown (the hint takes the bottom). Hovering
            a removable part on the car swaps it for the removal prompt. */}
        {!teardown && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
            <span
              className={`text-[12px] ${
                hoverModLabel || hoverPartName || selectedId ? "text-marble-body" : "text-marble-dim"
              }`}
            >
              {hoverModLabel
                ? `Click to remove · ${hoverModLabel}`
                : hoverPartName || railHoverName
                ? `Click to inspect · ${hoverPartName || railHoverName}`
                : selectedId
                ? "Click the car or press ESC to put it back"
                : `${paintObj ? `${paintObj.name} · ` : ""}drag to rotate`}
            </span>
          </div>
        )}
      </div>

      {/* Config rail */}
      {config ? (
        <div className="flex flex-col gap-4 border-t border-white/[0.07] bg-marble-rail p-5 lg:border-l lg:border-t-0">
          <div>
            <SectionLabel>BODY</SectionLabel>
            <Segmented
              className="mt-2 w-full [&>button]:flex-1"
              items={config.body.map((b) => ({ id: b.id, label: b.label }))}
              value={body}
              onChange={setBody}
            />
          </div>

          {!paintLocked && (
          <div>
            <SectionLabel className="flex items-center justify-between">
              <span>PAINT · {config.paintYear}</span>
              <span className="normal-case tracking-normal text-marble-mid">{paintObj?.name}</span>
            </SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {paintOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPaint(p.id)}
                  title={p.name}
                  style={{ background: p.fill }}
                  className={`h-[34px] w-[34px] rounded-full ring-offset-2 ring-offset-marble-rail transition ${
                    p.id === paint ? "ring-2 ring-marble-accent" : "ring-1 ring-white/15 hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>
          )}

          {/* MODS (M2) — bolt-ons this car's model can actually show/hide. Only
              rendered for cars with a partGroups entry in lib/parts.js. */}
          {mods?.length > 0 && (
            <div>
              <SectionLabel>MODS</SectionLabel>
              <div className="mt-2 space-y-1.5">
                {mods.map((m) => {
                  const on = !!toggles[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMod(m.id)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-2.5 rounded-[7px] border px-3 py-2.5 text-left transition ${
                        on ? "border-marble-accent/40 bg-marble-accent/[0.06]" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
                          on ? "border-marble-accent bg-marble-accent" : "border-white/25"
                        }`}
                      >
                        {on && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-marble-onaccent" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m2.5 6 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 text-[12px] text-marble-body">{m.label}</span>
                      <span className="font-mono text-[10px] text-marble-dim">{m.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SYSTEMS (Teardown parts) — every part the breakdown knows about, whether
              or not you can see it on the car. Clicking a part on the model only works
              for whatever is outermost under the cursor, so the engine, drivetrain and
              suspension (procedural stand-ins, hidden until they explode) and anything
              buried behind another part are reachable only from here. Same click as on
              the car: pop it out and open its card. */}
          {breakdown?.parts?.length > 0 && (
            <div>
              <SectionLabel>SYSTEMS</SectionLabel>
              <div className="mt-2 space-y-1">
                {breakdown.parts.map((pt, i) => {
                  const on = selectedId === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => selectPart(pt.id)}
                      onMouseEnter={() => setRailHover(pt.id)}
                      onMouseLeave={() => setRailHover((cur) => (cur === pt.id ? null : cur))}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-2 rounded-[7px] border px-2.5 py-2 text-left transition ${
                        on
                          ? "border-marble-accent/50 bg-marble-accent/[0.10]"
                          : "border-white/[0.07] hover:border-marble-accent/30 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="font-mono text-[9px] text-marble-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={`flex-1 truncate text-[12px] ${on ? "text-marble-hi" : "text-marble-body"}`}>
                        {pt.label}
                      </span>
                      {!pt.modeled && (
                        <span
                          className="font-mono text-[9px] text-marble-faint"
                          title="Shown as a generic stand-in — this model has no mesh for it"
                        >
                          STAND-IN
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10.5px] text-marble-dim">
                Hover to highlight it, click to pull it off the car.
              </p>
            </div>
          )}

          <div>
            <SectionLabel>TRIM</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {config.trim.map((t) => {
                const on = t.id === trim;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTrim(t.id)}
                    className={`rounded-lg border p-2.5 text-left transition ${
                      on ? "border-marble-accent/50 bg-marble-accent/10" : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-marble-hi">{t.name}</div>
                    <div className={`mt-0.5 font-mono text-[10px] ${on ? "text-marble-accent" : "text-marble-dim"}`}>
                      {t.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel>PACKAGES</SectionLabel>
            <div className="mt-2 space-y-1.5">
              {config.packages.map((pk) => {
                const on = packages.includes(pk.id);
                return (
                  <button
                    key={pk.id}
                    onClick={() => togglePkg(pk.id)}
                    className={`flex w-full items-center gap-2.5 rounded-[7px] border px-3 py-2.5 text-left transition ${
                      on ? "border-marble-accent/40 bg-marble-accent/[0.06]" : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
                        on ? "border-marble-accent bg-marble-accent" : "border-white/25"
                      }`}
                    >
                      {on && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-marble-onaccent" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m2.5 6 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-[12px] text-marble-body">{pk.label}</span>
                    <span className="font-mono text-[11px] text-marble-dim">
                      {pk.price === 0 ? "+$0" : `+$${pk.price.toLocaleString()}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-auto rounded-[10px] bg-marble-panel p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-marble-dim">As configured · {config.msrpLabel}</span>
              <span className="text-[16px] font-bold text-marble-hi">${total.toLocaleString()}</span>
            </div>
            <PrimaryButton
              className="mt-3 w-full"
              onClick={() => setFindOpen((o) => !o)}
              aria-expanded={findOpen}
              disabled={!marketplaces.length}
            >
              Find one for sale today {findOpen ? "▴" : "→"}
            </PrimaryButton>
            {findOpen && marketplaces.length > 0 && (
              <div className="td-fade-up mt-2 space-y-1">
                {marketplaces.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-[7px] border border-white/10 px-2.5 py-2 transition hover:border-marble-accent/40 hover:bg-marble-accent/[0.06]"
                  >
                    <span className="flex-1 text-[12px] text-marble-body">{m.label}</span>
                    <span className="font-mono text-[10px] text-marble-dim">{m.note}</span>
                    <span className="text-[11px] text-marble-faint">↗</span>
                  </a>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10.5px] text-marble-dim">
              Searches {years ? `${years} ` : ""}{vehicle.make} {vehicle.model} on each site —
              listings aren't filtered by the paint and mods above.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-2 border-t border-white/[0.07] bg-marble-rail p-6 lg:border-l lg:border-t-0">
          <SectionLabel>CONFIGURATOR</SectionLabel>
          <p className="text-sm text-marble-mid">
            The full build configurator is tuned for our showcase cars. Explore this
            vehicle's specs and reliability in <span className="text-marble-accent">Profile</span>, or
            its serviceable parts in <span className="text-marble-accent">Explode</span>.
          </p>
        </div>
      )}
    </div>
  );
}

// Suspense fallback while the 3D chunk + GLB load (matches Stage3D's).
function StageLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="animate-pulse font-mono text-[11px] tracking-wide text-marble-dim">loading 3D…</span>
    </div>
  );
}

// The Teardown toggle (bottom-right): a 3-square diagonal glyph + label. Idle =
// outlined cobalt "TEARDOWN"; active = solid cobalt "REASSEMBLE"; disabled while
// the model loads. Inline styles keep the exact design tokens from the handoff.
function TeardownButton({ active, loading, onClick }) {
  const color = active ? "#0d0d0f" : "#8fb0f5";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="td-btn absolute bottom-5 right-5 z-20"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 18px",
        borderRadius: 6,
        cursor: loading ? "default" : "pointer",
        font: "600 11px 'JetBrains Mono', monospace",
        letterSpacing: ".2em",
        border: `1px solid ${active ? "#5a8cf0" : "rgba(90,140,240,.5)"}`,
        background: active ? "#5a8cf0" : "rgba(90,140,240,.1)",
        color,
        opacity: loading ? 0.45 : 1,
        transition: "background .2s, color .2s, border-color .2s, opacity .2s",
      }}
    >
      <span style={{ position: "relative", width: 13, height: 13, display: "inline-block", flex: "none" }}>
        <span style={{ position: "absolute", left: 0, top: 0, width: 4, height: 4, background: color }} />
        <span style={{ position: "absolute", left: 5, top: 5, width: 4, height: 4, background: color }} />
        <span style={{ position: "absolute", left: 10, top: 10, width: 4, height: 4, background: color }} />
      </span>
      {loading ? "LOADING 3D" : active ? "REASSEMBLE" : "TEARDOWN"}
    </button>
  );
}
