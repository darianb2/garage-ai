// Thin wrappers over the Flask data engine. In dev these go through the Vite
// proxy (/api -> :5000); in prod Flask serves the built app from the same origin.

export async function getCatalog() {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("Could not load the catalog.");
  return res.json();
}

// Teardown/exploded-view descriptor for a model slug (the Showroom's "Teardown").
// 404s for any car without a curated breakdown — the caller hides the Teardown
// button on failure, so this stays a soft feature-detect.
export async function getBreakdown(slug) {
  const res = await fetch(`/api/breakdown/${slug}`);
  if (!res.ok) throw new Error(`breakdown ${res.status}`);
  return res.json();
}

// Build a full profile for any vehicle (live NHTSA data + curated specs if we
// have the car). `vehicle` needs { make, model, year }; `generation` is optional
// but lets the backend pick the right trim's specs when a model+year covers
// several (Camaro SS vs ZL1, Mustang GT vs GT350).
export async function getProfile({ make, model, year, generation }) {
  const params = new URLSearchParams({ make, model, year });
  if (generation) params.set("generation", generation);
  const res = await fetch("/api/profile?" + params.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Ask a free-text question about a car (Task 6 homepage answer layer). The
// backend identifies which catalog car it's about and answers grounded in our
// data + NHTSA. Resolves to { vehicle, answer, sources, question }; `vehicle` is
// null when no car could be identified (then `answer` asks the user to name one).
export async function askAnswer(question) {
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "The assistant hit an error.");
  return data;
}

// Compare two or three cars (Task 8). The side-by-side spec table is built
// client-side from each car's profile; this returns only the OPTIONAL AI layer —
// a short "key differences" readout grounded in the same curated specs + NHTSA
// data. `vehicles` is an array of { make, model, year }. Resolves to
// { summary, sources }.
export async function compareCars(vehicles) {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicles }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Could not compare these cars.");
  return data;
}
