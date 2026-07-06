import { useMemo, useState } from "react";
import Viewer3D from "./Stage3D";
import { configFor } from "../lib/config";
import { SectionLabel, Segmented, PrimaryButton, Mono } from "./ui";

// Showroom mode (design ref #4a Showroom): the persistent 3D stage on the left +
// a configurator rail on the right. Package deltas sum into "as configured" live.
export default function ShowroomMode({ vehicle, model }) {
  const config = useMemo(() => configFor(vehicle), [vehicle]);
  const [body, setBody] = useState(config?.defaults.body);
  const [paint, setPaint] = useState(config?.defaults.paint);
  const [trim, setTrim] = useState(config?.defaults.trim);
  const [packages, setPackages] = useState(config?.defaults.packages || []);

  const paintObj = config?.paint.find((p) => p.id === paint);
  const bodyObj = config?.body.find((b) => b.id === body);
  const total = config
    ? config.msrpBase +
      config.packages.filter((p) => packages.includes(p.id)).reduce((s, p) => s + p.price, 0)
    : 0;
  const togglePkg = (id) =>
    setPackages((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="grid overflow-hidden rounded-xl border border-white/[0.07] lg:grid-cols-[1fr_340px]">
      {/* Stage */}
      <div className="marble-stage relative min-h-[460px]">
        <div className="pointer-events-none absolute left-4 top-3 z-10">
          <Mono className="text-[10px] !text-marble-faint">
            SHOWROOM · {vehicle.year} {vehicle.model.toUpperCase()}
            {bodyObj ? ` · ${bodyObj.label.toUpperCase()}` : ""}
          </Mono>
        </div>
        <div className="absolute right-4 top-3 z-10 flex gap-1.5">
          {["⟲ 360°", "⊕ zoom"].map((c) => (
            <span key={c} className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-marble-mid">
              {c}
            </span>
          ))}
        </div>
        <div className="absolute inset-0">
          <Viewer3D model={model} dark spin={false} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
          <span className="text-[12px] text-marble-dim">
            {paintObj ? `${paintObj.name} · ` : ""}drag to rotate
          </span>
        </div>
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

          <div>
            <SectionLabel className="flex items-center justify-between">
              <span>PAINT · {config.paintYear}</span>
              <span className="normal-case tracking-normal text-marble-mid">{paintObj?.name}</span>
            </SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {config.paint.map((p) => (
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
            <PrimaryButton className="mt-3 w-full">Find this build for sale today →</PrimaryButton>
            <p className="mt-2 text-[10.5px] text-marble-dim">
              Exact matches first — closest compromise if none listed.
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
