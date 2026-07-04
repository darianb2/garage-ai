import { useState } from "react";
import { askAnswer } from "../lib/api";
import { PrimaryButton, Spinner, SectionLabel } from "./ui";

const EXAMPLES = [
  "Is the E46 M3 reliable?",
  "What breaks on the GT-R?",
  "Is a used CR-V a good buy?",
];

// A global "Ask Garage AI" dialog (opened from the nav). Sends the question to
// /api/answer, which identifies the car and answers grounded in our data + NHTSA.
// If a car is resolved, we jump into its Hub (with the answer shown on top);
// otherwise the reply — usually a nudge to name a car — shows inline.
export default function AskModal({ onClose, onOpen }) {
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [reply, setReply] = useState(null);

  const ask = async (raw) => {
    const question = (raw ?? q).trim();
    if (!question || asking) return;
    setAsking(true);
    setReply(null);
    try {
      const data = await askAnswer(question);
      if (data.vehicle) {
        onOpen(data.vehicle, data); // jump to the car's Hub with the answer
        onClose();
      } else {
        setReply({ text: data.answer });
      }
    } catch (e) {
      setReply({ text: e.message, error: true });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-marble-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <SectionLabel className="!text-marble-accent">ASK GARAGE AI</SectionLabel>
          <button onClick={onClose} className="text-sm text-marble-dim hover:text-marble-body">
            close
          </button>
        </div>
        <p className="mt-2 text-sm text-marble-mid">
          Ask anything about a specific car — reliability, what breaks, mods, whether to
          buy. Answered from our curated data + live NHTSA, never invented.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-3 flex gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. is the Mk4 Supra reliable?"
            className="w-full rounded-lg border border-white/10 bg-marble-panel2 px-3 py-2.5 text-marble-hi placeholder-marble-dim focus:border-marble-accent focus:outline-none"
          />
          <PrimaryButton type="submit" disabled={asking} className="shrink-0">
            {asking ? "…" : "Ask"}
          </PrimaryButton>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQ(ex); ask(ex); }}
              disabled={asking}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-marble-mid hover:border-marble-accent/50 hover:text-marble-accent disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>
        {asking && <div className="mt-4"><Spinner label="Reading the data…" /></div>}
        {reply && (
          <div
            className={`mt-4 whitespace-pre-line rounded-xl border p-4 text-sm leading-relaxed ${
              reply.error
                ? "border-red-500/30 bg-red-500/5 text-red-200"
                : "border-white/10 bg-marble-panel2 text-marble-body"
            }`}
          >
            {reply.text}
          </div>
        )}
      </div>
    </div>
  );
}
