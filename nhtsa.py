"""Live recall data from NHTSA's free public API (no API key required).

This is the first piece of the Garage AI data engine. Instead of hand-curating
car facts, we pull them from a real automotive data source at request time —
which means it works for *any* car, not just the ones we typed in by hand.

NHTSA (the US National Highway Traffic Safety Administration) publishes recalls,
complaints, and safety ratings for free. We start here because it costs nothing
and needs no sign-up. Docs: https://www.nhtsa.gov/nhtsa-datasets-and-apis

Only the Python standard library is used, so there's nothing new to install.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

RECALLS_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle"
COMPLAINTS_URL = "https://api.nhtsa.gov/complaints/complaintsByVehicle"
SAFETY_BASE = "https://api.nhtsa.gov/SafetyRatings"
TIMEOUT_SECONDS = 10


def _get_json(url):
    """Fetch a URL and parse the JSON body. Raises on network/HTTP errors."""
    request = urllib.request.Request(url, headers={"User-Agent": "garage-ai"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.load(response)


def get_recalls(make, model, year):
    """Return open recalls for a make/model/year as a list of simple dicts.

    Each recall has: campaign, component, summary, consequence, remedy,
    park_it (stop driving — fire risk), park_outside (park away from structures),
    and reported (date). Returns an empty list when there are no recalls.
    """
    query = urllib.parse.urlencode({"make": make, "model": model, "modelYear": year})
    try:
        data = _get_json(f"{RECALLS_URL}?{query}")
    except urllib.error.HTTPError as err:
        # NHTSA replies 400 for a make/model it doesn't recognize. Treat that as
        # "no data" (empty list) so the UI shows a friendly message; let real
        # outages (5xx, network errors) propagate as actual errors.
        if err.code == 400:
            return []
        raise
    recalls = []
    for item in data.get("results", []):
        recalls.append({
            "campaign": item.get("NHTSACampaignNumber"),
            "component": item.get("Component"),
            "summary": item.get("Summary"),
            "consequence": item.get("Consequence"),
            "remedy": item.get("Remedy"),
            "park_it": item.get("parkIt", False),
            "park_outside": item.get("parkOutSide", False),
            "reported": item.get("ReportReceivedDate"),
        })
    return recalls


def get_complaints(make, model, year):
    """Return consumer complaints for a make/model/year as a list of dicts.

    Each complaint has: components (what the owner says failed), summary,
    crash/fire flags, injuries, deaths, and the date filed. Returns an empty
    list when NHTSA has nothing (or doesn't recognize the vehicle).
    """
    query = urllib.parse.urlencode({"make": make, "model": model, "modelYear": year})
    try:
        data = _get_json(f"{COMPLAINTS_URL}?{query}")
    except urllib.error.HTTPError as err:
        if err.code == 400:  # unrecognized vehicle -> treat as "no data"
            return []
        raise
    complaints = []
    for item in data.get("results", []):
        complaints.append({
            "components": item.get("components"),
            "summary": item.get("summary"),
            "crash": item.get("crash", False),
            "fire": item.get("fire", False),
            "injuries": item.get("numberOfInjuries", 0),
            "deaths": item.get("numberOfDeaths", 0),
            "filed": item.get("dateComplaintFiled"),
        })
    return complaints


def get_safety_ratings(make, model, year):
    """Return NHTSA (NCAP) crash-test ratings for a make/model/year, or None.

    NCAP is a two-step API: first look up the vehicle id(s) for the
    year/make/model, then fetch the ratings for the first one. Ratings come back
    as strings like "5" (stars) or "Not Rated"; we turn the latter into None.
    Returns None when NHTSA has no crash-test entry for the vehicle.
    """
    path = (f"{SAFETY_BASE}/modelyear/{urllib.parse.quote(str(year))}"
            f"/make/{urllib.parse.quote(make)}/model/{urllib.parse.quote(model)}")
    try:
        index = _get_json(path)
    except urllib.error.HTTPError as err:
        if err.code in (400, 404):
            return None
        raise
    results = index.get("Results", [])
    if not results:
        return None
    vehicle_id = results[0].get("VehicleId")
    detail = _get_json(f"{SAFETY_BASE}/VehicleId/{vehicle_id}")
    rating = (detail.get("Results") or [{}])[0]

    def clean(value):
        return value if value and value != "Not Rated" else None

    return {
        "description": rating.get("VehicleDescription"),
        "overall": clean(rating.get("OverallRating")),
        "front": clean(rating.get("OverallFrontCrashRating")),
        "side": clean(rating.get("OverallSideCrashRating")),
        "rollover": clean(rating.get("RolloverRating")),
    }


if __name__ == "__main__":
    # Quick manual test:  ./.venv/bin/python nhtsa.py honda civic 2022
    import sys

    make = sys.argv[1] if len(sys.argv) > 1 else "honda"
    model = sys.argv[2] if len(sys.argv) > 2 else "civic"
    year = sys.argv[3] if len(sys.argv) > 3 else "2022"

    found = get_recalls(make, model, year)
    print(f"{len(found)} recall(s) for {year} {make.title()} {model.title()}:\n")
    for recall in found:
        flag = ""
        if recall["park_it"]:
            flag = "  [PARK IT — stop driving]"
        elif recall["park_outside"]:
            flag = "  [park outside]"
        print(f"- {recall['component']}{flag}")
        print(f"  {(recall['summary'] or '').strip()[:160]}")
        print()
