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
