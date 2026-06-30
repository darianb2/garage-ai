import { heroFor } from "../lib/images";
import { modelFor } from "../lib/models";

// A car's hero photo, or a styled make/model placeholder when we don't have one
// yet — so every car and tile looks intentional even before photos land.
// `variant` tunes the shape: a wide "hero" banner for the Vehicle Hub, a "tile"
// thumbnail for the catalog grid. Tiles get a small "3D" badge when we have a
// real interactive model for that car (3D is a bonus on top of the photo).
export default function CarImage({ vehicle, variant = "tile", className = "" }) {
  const src = heroFor(vehicle);
  const aspect = variant === "hero" ? "aspect-[16/5]" : "aspect-[16/10]";
  const label = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const model = modelFor(vehicle);
  const has3d = variant === "tile" && model && !model.demo;

  return (
    <div className={`relative w-full overflow-hidden rounded-lg ${className}`}>
      {src ? (
        <img
          src={src}
          alt={`${vehicle?.year ?? ""} ${label}`.trim()}
          loading="lazy"
          className={`${aspect} w-full object-cover`}
        />
      ) : (
        <div
          className={`${aspect} flex w-full items-center justify-center border border-zinc-800 bg-gradient-to-br from-zinc-800/80 to-zinc-950`}
        >
          <div className="px-2 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {vehicle?.make}
            </div>
            <div className="text-base font-semibold text-zinc-300">{vehicle?.model}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-zinc-600">
              Photo coming soon
            </div>
          </div>
        </div>
      )}
      {has3d && (
        <span className="absolute right-1.5 top-1.5 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
          3D
        </span>
      )}
    </div>
  );
}
