import { Card, Badge, SectionTitle } from "../ui";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

function Specs({ profile }) {
  const s = profile.specs;
  if (!s) return null;
  const rows = [
    ["Engine", s.engine],
    ["Horsepower", s.horsepower != null ? `${s.horsepower} hp` : null],
    ["Torque", s.torque],
    ["Drivetrain", s.drivetrain],
    ["Transmission", s.transmission],
    ["0-60", s["0_to_60"]],
    ["Curb weight", s.curb_weight],
    ["Fuel economy", s.fuel_economy],
  ].filter((r) => r[1]);
  return (
    <Card className="p-5">
      <SectionTitle>Specs · from our garage</SectionTitle>
      <div className="space-y-1 text-sm">
        {rows.map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </div>
      {s.reliability && (
        <p className="mt-3 text-sm text-amber-300/90">
          <span className="text-zinc-500">Our take: </span>
          {s.reliability}
        </p>
      )}
      {profile.curated_trims?.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          Curated trims: {profile.curated_trims.join(" · ")}
        </p>
      )}
    </Card>
  );
}

function Reliability({ profile }) {
  const r = profile.reliability;
  if (!r) return null;
  return (
    <Card className="p-5">
      <SectionTitle>Reliability signal</SectionTitle>
      <p className="text-lg font-semibold">{r.label}</p>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-300">
        <span>
          <b className="text-amber-500">{r.recalls}</b> recalls
        </span>
        <span>
          <b className="text-amber-500">{r.complaints}</b> complaints
        </span>
        <span>
          <b className="text-amber-500">{r.serious}</b> crash/fire/injury
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{r.caveat}</p>
    </Card>
  );
}

function Safety({ profile }) {
  const s = profile.safety;
  if (!s) return null;
  const star = (v) => (v ? (/^[0-9]$/.test(v) ? `${v} / 5★` : v) : "Not rated");
  const rows = [
    ["Overall", s.overall],
    ["Front crash", s.front],
    ["Side crash", s.side],
    ["Rollover", s.rollover],
  ];
  return (
    <Card className="p-5">
      <SectionTitle>Crash-test ratings</SectionTitle>
      <div className="space-y-1 text-sm">
        {rows.map(([k, v]) => (
          <Row key={k} label={k} value={star(v)} />
        ))}
      </div>
      {s.description && <p className="mt-2 text-xs text-zinc-600">{s.description}</p>}
    </Card>
  );
}

function Recalls({ profile }) {
  const recalls = profile.recalls || [];
  return (
    <Card className="p-5">
      <SectionTitle>Open recalls · {recalls.length}</SectionTitle>
      {recalls.length === 0 ? (
        <p className="text-sm text-zinc-400">None on file with NHTSA.</p>
      ) : (
        <div className="space-y-3">
          {recalls.map((r, i) => (
            <div key={i} className="border-l-2 border-zinc-700 pl-3">
              <div className="text-sm font-semibold text-zinc-100">
                {r.component || "Recall"}
                {r.park_it && (
                  <>
                    {" "}
                    <Badge tone="red">PARK IT</Badge>
                  </>
                )}
              </div>
              {r.summary && <p className="mt-1 text-sm text-zinc-400">{r.summary}</p>}
              <p className="mt-1 text-xs text-zinc-600">
                NHTSA {r.campaign}
                {r.reported ? ` · ${r.reported}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Complaints({ profile }) {
  const list = profile.complaints || [];
  if (!list.length) return null;
  return (
    <Card className="p-5">
      <SectionTitle>Recent complaints</SectionTitle>

      {/* Garage AI's digest of the raw NHTSA narratives — the headline takeaway. */}
      {profile.complaints_summary && (
        <p className="mb-4 border-l-2 border-amber-500/70 pl-3 text-sm leading-relaxed text-zinc-300">
          {profile.complaints_summary}
        </p>
      )}

      {/* Raw owner narratives are long and numerous, so keep them opt-in. */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-amber-500">
          Read individual reports
          {profile.complaints_count > list.length &&
            ` — ${list.length} of ${profile.complaints_count} on file`}
        </summary>
        <div className="mt-3 space-y-3">
          {list.map((c, i) => {
            const flags = [
              c.crash && "crash",
              c.fire && "fire",
              c.injuries && `${c.injuries} injured`,
            ].filter(Boolean);
            return (
              <div key={i} className="border-l-2 border-zinc-800 pl-3">
                <div className="text-xs text-zinc-500">
                  {c.components || "Complaint"}
                  {flags.length > 0 && (
                    <span className="ml-1 text-red-300">({flags.join(", ")})</span>
                  )}
                </div>
                {c.summary && <p className="mt-1 text-sm text-zinc-400">{c.summary}</p>}
              </div>
            );
          })}
        </div>
      </details>
    </Card>
  );
}

export default function ProfilePanel({ profile }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Specs profile={profile} />
      <Reliability profile={profile} />
      <Safety profile={profile} />
      <Recalls profile={profile} />
      <div className="lg:col-span-2">
        <Complaints profile={profile} />
      </div>
    </div>
  );
}
