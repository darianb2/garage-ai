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
