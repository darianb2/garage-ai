// Small shared building blocks for the dark/amber design system.

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 ${className}`}>
      {children}
    </div>
  );
}

const TONES = {
  zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  red: "bg-red-500/15 text-red-300 border-red-500/40",
};

export function Badge({ children, tone = "zinc" }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-500">
      {children}
    </h3>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-zinc-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
      {label}
    </div>
  );
}
