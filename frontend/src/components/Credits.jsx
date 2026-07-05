import credits from "../data/credits.json";
import { Mono } from "./ui";

// Photo attribution page (linked from the footer). Vehicle hero photos come from
// Wikimedia Commons; CC-BY / CC-BY-SA images legally require visible credit, so
// this surfaces Title · Author · Source · License for every photo. Generated from
// scripts/image_manifest.json via fetch_images.py, so it stays in sync.
export default function Credits({ onBack }) {
  const needCredit = credits.filter((c) => c.attributionRequired).length;
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <button onClick={onBack} className="text-[13px] text-marble-dim hover:text-marble-body">
        ← Back
      </button>
      <h1 className="mt-4 text-[30px] font-extrabold tracking-[-0.01em] text-marble-hi">Photo credits</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-marble-mid">
        Vehicle photos are sourced from{" "}
        <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className="text-marble-accent hover:underline">
          Wikimedia Commons
        </a>{" "}
        under free licenses. Our thanks to the photographers below — {needCredit} of{" "}
        {credits.length} images are used under CC-BY / CC-BY-SA, with attribution as those
        licenses require; the rest are CC0 or public domain.
      </p>

      <div className="mt-7">
        <Mono className="text-[11px]">{credits.length} PHOTOS</Mono>
        <ul className="mt-2 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07]">
          {credits.map((c) => (
            <li
              key={c.title}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-marble-hi">{c.car}</div>
                <a
                  href={c.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block max-w-full truncate text-[12px] text-marble-dim hover:text-marble-accent"
                  title={c.title}
                >
                  {c.title}
                </a>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[12px]">
                <span className="text-marble-mid">{c.author}</span>
                <a
                  href={c.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[11px] text-marble-dim hover:border-marble-accent/50 hover:text-marble-accent"
                >
                  {c.license}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
