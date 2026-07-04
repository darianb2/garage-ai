// Small shared building blocks for the Marble design system (dark zinc + cobalt).

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-marble-panel ${className}`}>
      {children}
    </div>
  );
}

const TONES = {
  zinc: "bg-white/[0.06] text-marble-mid border-white/10",
  cobalt: "bg-marble-accent/15 text-marble-accent border-marble-accent/40",
  red: "bg-red-500/15 text-red-300 border-red-500/40",
};

export function Badge({ children, tone = "zinc", className = "" }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// A chassis/data badge in the monospace face — e.g. "A80", "3D READY".
export function ChassisBadge({ children, className = "" }) {
  return (
    <span
      className={`inline-block rounded-[5px] border border-marble-accent/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-marble-accent ${className}`}
    >
      {children}
    </span>
  );
}

// Monospace metadata label — chassis codes, section labels, data badges.
export function Mono({ children, className = "" }) {
  return (
    <span className={`font-mono uppercase tracking-[0.1em] text-marble-dim ${className}`}>
      {children}
    </span>
  );
}

// Section label used inside rails: mono, tiny, dim, spaced.
export function SectionLabel({ children, className = "" }) {
  return (
    <div
      className={`font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-marble-dim ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-marble-dim">
      {children}
    </h3>
  );
}

// Segmented control — the mode switch (Showroom/Explode/Profile) and the
// Explode view toggle (On car/Bench). items: [{ id, label }].
export function Segmented({ items, value, onChange, className = "" }) {
  return (
    <div
      className={`inline-flex gap-0.5 rounded-[9px] border border-white/10 bg-marble-panel2 p-[3px] ${className}`}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`rounded-[7px] px-3.5 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-marble-accent font-semibold text-marble-onaccent"
                : "text-marble-mid hover:text-marble-body"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// Primary cobalt action button.
export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-lg bg-marble-accent px-4 py-2 text-sm font-semibold text-marble-onaccent transition hover:brightness-110 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-marble-mid">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-marble-accent" />
      {label}
    </div>
  );
}
