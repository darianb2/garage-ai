// Thin wrappers over the Flask data engine. In dev these go through the Vite
// proxy (/api -> :5000); in prod Flask serves the built app from the same origin.

export async function getCatalog() {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("Could not load the catalog.");
  return res.json();
}

// Build a full profile for any vehicle (live NHTSA data + curated specs if we
// have the car). `vehicle` needs { make, model, year }.
export async function getProfile({ make, model, year }) {
  const params = new URLSearchParams({ make, model, year });
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
