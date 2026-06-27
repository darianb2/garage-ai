"""Flask web backend for Garage AI.

Serves the car database (loaded from data/cars/*.json) over HTTP.
Run locally:  ./.venv/bin/python app.py   then open http://localhost:5000

Endpoints:
  GET /                  health/info
  GET /api/cars          list of car summaries (name, engine, hp, drivetrain)
  GET /api/car/<name>    full data for one car (exact, case-insensitive)
  GET /api/search?q=...  fuzzy search → list of summaries
"""

import os
import threading
import time
from datetime import date, datetime, timezone

from flask import Flask, jsonify, redirect, render_template, request, url_for

from car_profile import build_profile
from loader import load_cars, load_catalog
from nhtsa import get_recalls
from search import find_matches

app = Flask(__name__)
cars = load_cars()
catalog = load_catalog()

# --- AI research assistant ("Ask about this car") --------------------------
# Grounded Q&A: the car's verified JSON is the factual backbone; Claude adds the
# real-world owner wisdom spec sites scatter across forums. Single Messages API
# call (not an agent) — the simplest, cheapest tier that fits.
ASK_MODEL = "claude-opus-4-8"
# Enough headroom for the longest answers (the "checklist" insight prompts run
# ~1k+ tokens); 1024 truncated them mid-sentence. Still a small non-streaming
# request, and the per-IP / daily rate limits bound total spend.
ASK_MAX_TOKENS = 2048
MAX_QUESTION_CHARS = 500

# One-tap "insight" prompts shown as chips on each car page. Centralised here so
# the prompts stay quality-controlled instead of depending on the visitor.
INSIGHTS = [
    ("What breaks?",
     "What are the most common problems on this car, and roughly at what mileage "
     "do they tend to show up?"),
    ("Before you buy",
     "Give me a pre-purchase inspection checklist specific to this exact car and "
     "generation: what to check, and what red flags mean walk away."),
    ("Should I mod it?",
     "What's a sensible modification path for this car, and what reliability risks "
     "should I watch for?"),
    ("5-year cost",
     "Estimate the real cost of owning this car for 5 years: routine maintenance, "
     "the big-ticket repairs that are likely, and insurance considerations."),
    ("Right for me?",
     "Honestly, who is this car right for, and who would be disappointed by it? "
     "What is it actually like to live with day to day?"),
]

SYSTEM_TEMPLATE = (
    "You are Garage AI, a knowledgeable, honest car-enthusiast friend — like the "
    "person on a forum who has actually owned the car. Answer using the verified "
    "data below as your factual backbone, and add the real-world ownership wisdom "
    "spec sheets leave out: what tends to break and when, what to check before "
    "buying, what it's genuinely like to live with. Be specific and concise. If "
    "you are not sure about something, say so rather than guessing. Write in short "
    "paragraphs and plain hyphen bullet points; do not use markdown bold, headers, "
    "or emoji.\n\nVERIFIED DATA:\n{facts}"
)


def _car_facts(name, car):
    """Flatten one car's data into a plain-text block to ground the model."""
    lines = [name, f"Engine: {car['engine']}", f"Horsepower: {car['horsepower']} hp"]
    for key in ("torque", "drivetrain", "transmission", "0_to_60", "fuel_economy",
                "curb_weight", "reliability", "cost_to_own", "oil_type", "oil_interval"):
        lines.append(f"{key.replace('_', ' ').title()}: {car[key]}")
    for key in ("generations", "common_issues", "maintenance_tips", "popular_mods"):
        value = car[key]
        lines.append(f"\n{key.replace('_', ' ').title()}:")
        items = value.values() if isinstance(value, dict) else value
        lines.extend(f"- {item}" for item in items)
    return "\n".join(lines)


def _stub_answer(name, question):
    """Returned when no ANTHROPIC_API_KEY is set, so the UI works with no cost."""
    return (
        f"(Demo mode) You asked about the {name}: “{question}”\n\n"
        "Once an Anthropic API key is configured, Garage AI answers this for real "
        "— using the car's verified data plus owner-level insight (what breaks, "
        "what to check before buying, what it's like to own). This placeholder "
        "confirms the chat is wired up end to end."
    )


def answer_question(name, car, question):
    """Answer a question about one car. Falls back to a stub without an API key."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _stub_answer(name, question)
    import anthropic

    client = anthropic.Anthropic()
    message = client.messages.create(
        model=ASK_MODEL,
        max_tokens=ASK_MAX_TOKENS,
        system=SYSTEM_TEMPLATE.format(facts=_car_facts(name, car)),
        messages=[{"role": "user", "content": question}],
    )
    return "".join(block.text for block in message.content if block.type == "text")

# --- rate limiting for the Ask endpoint ------------------------------------
# Once a real key is set, each /api/ask call costs money — and the app is on a
# public URL, so anyone could spam it. Two cheap, in-memory guards (per worker;
# fine because the free Render dyno runs a single gunicorn worker — bump these
# if you ever scale to multiple workers, since each keeps its own counters):
#   - per visitor: a handful of questions per rolling hour
#   - global:      a daily ceiling so one busy day can't run up a surprise bill
ASK_PER_IP_PER_HOUR = 10
ASK_GLOBAL_PER_DAY = 300

_ask_lock = threading.Lock()
_ask_hits = {}  # ip -> list of request timestamps within the last hour
_ask_day = {"date": None, "count": 0}


def _client_ip():
    """Best-effort caller IP. Render (like most PaaS) sits behind a proxy, so the
    real client is the first hop in X-Forwarded-For, not request.remote_addr."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "?")


def rate_limit_error():
    """Reserve one slot for this caller. Returns a friendly message if they (or
    the app as a whole) are over the limit, else None and the slot is counted."""
    now = time.time()
    today = date.today().isoformat()
    ip = _client_ip()
    with _ask_lock:
        if _ask_day["date"] != today:  # new day → reset the global counter
            _ask_day["date"], _ask_day["count"] = today, 0
        if _ask_day["count"] >= ASK_GLOBAL_PER_DAY:
            return "Garage AI has hit its daily limit — please try again tomorrow."
        recent = [t for t in _ask_hits.get(ip, []) if now - t < 3600]
        if len(recent) >= ASK_PER_IP_PER_HOUR:
            return ("You've asked a lot in the last hour — give it a few minutes "
                    "and try again.")
        recent.append(now)
        _ask_hits[ip] = recent
        _ask_day["count"] += 1
    return None

# Runtime-only files (gitignored; ephemeral on hosts like Railway/Heroku).
SUGGESTIONS_FILE = os.path.join(os.path.dirname(__file__), "data", "suggestions.log")
HITS_FILE = os.path.join(os.path.dirname(__file__), "data", "hits.txt")
_hits_lock = threading.Lock()


def record_hit():
    """Increment and return the homepage visit count (thread-safe within a worker)."""
    with _hits_lock:
        try:
            with open(HITS_FILE) as f:
                count = int(f.read().strip() or 0)
        except (FileNotFoundError, ValueError):
            count = 0
        count += 1
        with open(HITS_FILE, "w") as f:
            f.write(str(count))
        return count


def summary(name):
    d = cars[name]
    return {
        "name": name,
        "engine": d["engine"],
        "horsepower": d["horsepower"],
        "drivetrain": d["drivetrain"],
    }


@app.route("/")
def index():
    return render_template(
        "index.html",
        cars=[summary(name) for name in cars],
        thanks=request.args.get("thanks"),
        hits=record_hit(),
    )


@app.route("/suggest", methods=["POST"])
def suggest():
    name = request.form.get("car", "").strip()
    if name:
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with open(SUGGESTIONS_FILE, "a", encoding="utf-8") as f:
            f.write(f"{ts}\t{name}\n")
        return redirect(url_for("index", thanks=name))
    return redirect(url_for("index"))


@app.route("/car/<path:name>")
def car_page(name):
    target = name.strip().lower()
    for car_name in cars:
        if car_name.lower() == target:
            return render_template(
                "car.html", name=car_name, car=cars[car_name], insights=INSIGHTS
            )
    return ("Car not found", 404)


@app.route("/api/ask/<path:name>", methods=["POST"])
def api_ask(name):
    target = name.strip().lower()
    for car_name in cars:
        if car_name.lower() == target:
            question = (request.get_json(silent=True) or {}).get("question", "").strip()
            if not question:
                return jsonify({"error": "Ask a question first."}), 400
            if len(question) > MAX_QUESTION_CHARS:
                return jsonify({"error": "That question is a bit long — keep it under "
                                f"{MAX_QUESTION_CHARS} characters."}), 400
            limited = rate_limit_error()
            if limited:
                return jsonify({"error": limited}), 429
            try:
                answer = answer_question(car_name, cars[car_name], question)
            except Exception as exc:  # surface a friendly message, log the detail
                app.logger.exception("Ask failed for %s", car_name)
                return jsonify({"error": f"The assistant hit an error: {exc}"}), 502
            return jsonify({"answer": answer})
    return jsonify({"error": f"No car named '{name}'"}), 404


@app.route("/api/cars")
def api_cars():
    return jsonify([summary(name) for name in cars])


@app.route("/api/car/<path:name>")
def api_car(name):
    target = name.strip().lower()
    for car_name in cars:
        if car_name.lower() == target:
            return jsonify({"name": car_name, **cars[car_name]})
    return jsonify({"error": f"No car named '{name}'"}), 404


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "")
    return jsonify([summary(name) for name in find_matches(query, cars)])


# --- Recall lookup (live NHTSA data) ---------------------------------------
# First piece of the "data engine": instead of curated facts, pull recalls from
# a real automotive API at request time. Free, no key — works for any US car.
@app.route("/recalls")
def recalls_page():
    return render_template("recalls.html")


@app.route("/api/recalls")
def api_recalls():
    make = request.args.get("make", "").strip()
    model = request.args.get("model", "").strip()
    year = request.args.get("year", "").strip()
    if not (make and model and year):
        return jsonify({"error": "Enter make, model, and year."}), 400
    try:
        recalls = get_recalls(make, model, year)
    except Exception as exc:  # network/HTTP trouble — surface a friendly message
        app.logger.exception("Recall lookup failed for %s %s %s", make, model, year)
        return jsonify({"error": f"Could not reach the recall service: {exc}"}), 502
    return jsonify({"make": make, "model": model, "year": year, "recalls": recalls})


# --- Car profile (the data engine) -----------------------------------------
# Builds one assembled profile for ANY car from free NHTSA data, and merges in
# our hand-curated JSON specs when we happen to have that car. This is the first
# route that follows the North Star: "build the car on demand" instead of
# "look it up in our fixed list of 17."
def _curated_for(make, model):
    """Names of cars in our garage matching this make+model (best-effort).

    Until we add a commercial specs API, the hand-curated JSON is our spec
    source. Match by substring so "Infiniti" + "Q50" finds all our Q50 trims.
    """
    mk, md = make.lower(), model.lower()
    return [name for name in cars if mk in name.lower() and md in name.lower()]


@app.route("/catalog")
def catalog_page():
    # Breadth layer: hundreds of popular enthusiast cars. Each links into the
    # profile engine, which fills in the live data on demand.
    return render_template("catalog.html", catalog=catalog)


@app.route("/api/catalog")
def api_catalog():
    # JSON catalog for the React frontend's search-first landing page.
    return jsonify(catalog)


@app.route("/profile")
def profile_page():
    return render_template("profile.html")


@app.route("/api/profile")
def api_profile():
    make = request.args.get("make", "").strip()
    model = request.args.get("model", "").strip()
    year = request.args.get("year", "").strip()
    if not (make and model and year):
        return jsonify({"error": "Enter make, model, and year."}), 400
    matches = _curated_for(make, model)
    specs = cars[matches[0]] if matches else None
    try:
        profile = build_profile(make, model, year, specs=specs)
    except Exception as exc:  # network/HTTP trouble — surface a friendly message
        app.logger.exception("Profile build failed for %s %s %s", make, model, year)
        return jsonify({"error": f"Could not reach the data service: {exc}"}), 502
    # Tell the page which curated trims we have full detail pages for.
    profile["curated_trims"] = matches
    profile["specs_name"] = matches[0] if matches else None
    return jsonify(profile)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
