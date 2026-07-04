import { useEffect, useState } from "react";
import { getProfile, askAnswer } from "../lib/api";
import { modelFor } from "../lib/models";
import { ChassisBadge, Segmented, Spinner, PrimaryButton, SectionLabel } from "./ui";
import ShowroomMode from "./ShowroomMode";
import ExplodeMode from "./ExplodeMode";
import ProfilePanel from "./panels/ProfilePanel";

const MODES = [
  { id: "showroom", label: "Showroom" },
  { id: "explode", label: "Explode" },
  { id: "profile", label: "Profile" },
];

// The Vehicle Hub: one persistent 3D stage, three modes (design ref #4a).
// Showroom = configurator, Explode = serviceable-parts breakdown, Profile = the
// data profile + Ask Garage AI. Showroom/Explode render immediately from the 3D
// model + static data; only Profile waits on the live data fetch.
export default function VehicleHub({ vehicle, answer, onBack, onCompare, inCompare }) {
  const [mode, setMode] = useState("showroom");
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError(null);
    getProfile(vehicle)
      .then((p) => active && setProfile(p))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [vehicle]);

  const model = modelFor(vehicle);
  const chassis = (vehicle.generation || "").split(/[ (]/)[0];
  const years = vehicle.years || vehicle.year;
  const title = `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Hub top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.07] pb-3">
        <button onClick={onBack} className="text-[13px] text-marble-dim hover:text-marble-body">
          ← Search
        </button>
        <span className="h-4 w-px bg-white/10" />
        <h1 className="text-[18px] font-bold leading-tight text-marble-hi">{title}</h1>
        {chassis && <ChassisBadge>{chassis}</ChassisBadge>}
        <span className="text-[12px] text-marble-dim">{years}</span>
        <div className="ml-auto flex items-center gap-2">
          {onCompare && (
            <button
              onClick={() => onCompare(vehicle)}
              disabled={inCompare}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${
                inCompare
                  ? "cursor-default border-white/10 text-marble-dim"
                  : "border-white/15 text-marble-mid hover:border-marble-accent/50 hover:text-marble-accent"
              }`}
            >
              {inCompare ? "✓ Compare" : "+ Compare"}
            </button>
          )}
          <Segmented items={MODES} value={mode} onChange={setMode} />
        </div>
      </div>

      <div className="mt-4">
        {mode === "showroom" && <ShowroomMode vehicle={vehicle} model={model} />}
        {mode === "explode" && <ExplodeMode vehicle={vehicle} model={model} profile={profile} />}
        {mode === "profile" &&
          (error ? (
            <p className="text-red-300">{error}</p>
          ) : !profile ? (
            <Spinner label={`Assembling ${title} profile…`} />
          ) : (
            <ProfileMode vehicle={vehicle} profile={profile} answer={answer} />
          ))}
      </div>
    </div>
  );
}

// Profile mode: the existing data panel + Ask Garage AI (grounded on this car).
function ProfileMode({ vehicle, profile, answer }) {
  return (
    <div className="space-y-4">
      {answer && <AnswerCard data={answer} />}
      <AskBox vehicle={vehicle} />
      <ProfilePanel profile={profile} />
    </div>
  );
}

function AskBox({ vehicle }) {
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [reply, setReply] = useState(null);
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const ask = async (e) => {
    e.preventDefault();
    const question = q.trim();
    if (!question || asking) return;
    setAsking(true);
    setReply(null);
    try {
      // Ground on this car by naming it in the question the resolver reads.
      const data = await askAnswer(`${question} (about the ${name})`);
      setReply({ answer: data.answer, sources: data.sources });
    } catch (err) {
      setReply({ answer: err.message, sources: [] });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-marble-panel p-4">
      <SectionLabel>ASK GARAGE AI</SectionLabel>
      <form onSubmit={ask} className="mt-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask about the ${vehicle.model} — reliability, mods, what to check…`}
          className="w-full rounded-lg border border-white/10 bg-marble-panel2 px-3 py-2 text-sm text-marble-hi placeholder-marble-dim focus:border-marble-accent focus:outline-none"
        />
        <PrimaryButton type="submit" disabled={asking} className="shrink-0">
          {asking ? "…" : "Ask"}
        </PrimaryButton>
      </form>
      {asking && <div className="mt-3"><Spinner label="Reading the data…" /></div>}
      {reply && (
        <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-marble-body">
          {reply.answer}
          {reply.sources?.length > 0 && (
            <p className="mt-3 border-t border-white/10 pt-2 text-xs text-marble-dim">
              Based on: {reply.sources.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerCard({ data }) {
  const { question, answer, sources } = data;
  return (
    <section className="rounded-xl border border-marble-accent/30 bg-marble-accent/5 p-5">
      <SectionLabel className="!text-marble-accent">GARAGE AI</SectionLabel>
      {question && <p className="mt-1 text-sm italic text-marble-mid">“{question}”</p>}
      <div className="mt-3 whitespace-pre-line leading-relaxed text-marble-body">{answer}</div>
      {sources?.length > 0 && (
        <p className="mt-4 border-t border-marble-accent/10 pt-3 text-xs text-marble-dim">
          Based on: {sources.join(" · ")}
        </p>
      )}
    </section>
  );
}
