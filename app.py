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
import re
import threading
import time
from datetime import date, datetime, timezone

from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    send_from_directory,
    url_for,
)

from car_profile import build_profile
from loader import load_cars, load_catalog
from nhtsa import get_recalls
from search import find_matches

app = Flask(__name__)
cars = load_cars()
catalog = load_catalog()

# --- Serving the built React frontend --------------------------------------
# Render's Python runtime has no Node, so the frontend is built locally
# (`npm run build`) and the resulting frontend/dist is committed. Flask serves
# that build as the site; /api/* stays dynamic. 3D models are large, so they
# live in frontend/public/models (committed once) and are served from there
# rather than duplicated into dist.
DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "frontend", "public", "models")

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

# --- complaint summariser ("Recent complaints" digest) ---------------------
# NHTSA complaint summaries are raw owner narratives — up to ~2,400 characters
# each, and there can be hundreds. Rather than dump a wall of them, we ask Claude
# to read the live data and write one short, honest paragraph: what owners
# actually report and how often. Grounded only in the data we already pulled, so
# it can't invent issues. Summaries are cached per vehicle (complaints don't
# change minute to minute), which keeps this to roughly one model call per car.
SUMMARY_MAX_TOKENS = 512  # a few sentences of plain prose, nothing more

SUMMARY_SYSTEM = (
    "You are Garage AI. Using only the NHTSA complaint data below, write 2-4 "
    "sentences of plain prose summarising what owners of this exact vehicle "
    "actually report. Lead with the most common problems and roughly how often "
    "they come up, then flag anything safety-critical (crashes, fires, injuries). "
    "Be specific and honest: do not invent issues that aren't in the data, and "
    "don't imply the car is dangerous when the reports are few or minor. No "
    "markdown, no bullet points, no emoji.\n\nCOMPLAINT DATA:\n{facts}"
)

_summary_cache = {}  # (make, model, year) -> summary string (per worker, like the rate limiter)
_summary_lock = threading.Lock()


def _complaint_facts(profile):
    """Flatten the complaint signal we already have into a plain-text block to
    ground the model: total volume, the grouped top components (from the full
    list), and a handful of real narratives for texture."""
    lines = [f"Total complaints on file: {profile['complaints_count']}"]
    issues = profile.get("common_issues") or []
    if issues:
        lines.append("Most-blamed components (by complaint volume):")
        lines.extend(f"- {component}: {count}" for component, count in issues)
    samples = profile.get("complaints") or []
    if samples:
        lines.append("\nSample owner narratives:")
        for c in samples:
            flags = [f for f in ("crash" if c.get("crash") else "",
                                 "fire" if c.get("fire") else "",
                                 f"{c['injuries']} injured" if c.get("injuries") else "") if f]
            tag = f" [{', '.join(flags)}]" if flags else ""
            text = (c.get("summary") or "").strip().replace("\n", " ")
            lines.append(f"- ({c.get('components') or 'unknown'}){tag} {text[:280]}")
    return "\n".join(lines)


def _stub_summary(profile):
    """Shown when no ANTHROPIC_API_KEY is set, so the UI works with no cost."""
    issues = profile.get("common_issues") or []
    if issues:
        top = ", ".join(f"{component.lower()} ({count})" for component, count in issues[:3])
        return (f"(Demo mode) Owners most often report problems with {top}. With an "
                f"API key set, Garage AI reads the {profile['complaints_count']} "
                "complaints on file and writes a short, honest summary here.")
    return ("(Demo mode) With an API key set, Garage AI summarises the owner "
            "complaints into a short, honest readout here.")


def summarize_complaints(make, model, year, profile):
    """One short paragraph digesting the live complaints, or None when there are
    none. Cached per vehicle; falls back to a stub without an API key."""
    if not profile.get("complaints"):
        return None
    key = (make.lower(), model.lower(), str(year))
    with _summary_lock:
        if key in _summary_cache:
            return _summary_cache[key]
    if not os.environ.get("ANTHROPIC_API_KEY"):
        summary = _stub_summary(profile)
    else:
        import anthropic

        client = anthropic.Anthropic()
        message = client.messages.create(
            model=ASK_MODEL,
            max_tokens=SUMMARY_MAX_TOKENS,
            system=SUMMARY_SYSTEM.format(facts=_complaint_facts(profile)),
            messages=[{"role": "user",
                       "content": f"Summarise the owner complaints for the {year} {make} {model}."}],
        )
        summary = "".join(b.text for b in message.content if b.type == "text").strip()
    with _summary_lock:
        _summary_cache[key] = summary
    return summary

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


def _spa_index():
    """The built React shell, or the legacy Jinja homepage when there's no
    build present (e.g. local dev, where Vite serves the app on :5173)."""
    built = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(built):
        return send_file(built)
    return render_template(
        "index.html",
        cars=[summary(name) for name in cars],
        thanks=request.args.get("thanks"),
        hits=record_hit(),
    )


@app.route("/")
def index():
    return _spa_index()


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


# --- Homepage AI answer layer (Task 6) -------------------------------------
# The homepage search bar accepts a QUESTION about a car ("is the Mk4 Supra
# reliable?"), not just a model name. We identify which catalog car the question
# is about, build that car's profile (the same data the Vehicle Hub shows), and
# answer with ONE grounded Claude call; the frontend renders the answer on top of
# that car's page. Grounded only in our curated specs + free NHTSA data, so it
# explains our data instead of inventing facts — and when the data can't answer,
# it says so (the trigger for Task 7's web-search tool, which is NOT built here).
ANSWER_SYSTEM = (
    "You are Garage AI, answering a visitor's question about ONE specific car shown "
    "on its page. Answer using ONLY the verified data below - our curated specs plus "
    "free NHTSA recall and complaint data. Be the honest, knowledgeable enthusiast "
    "friend: direct, specific, and concise (a few short paragraphs or plain hyphen "
    "bullets). If the data below does not cover what was asked, say so plainly and "
    "point to what the data DOES show, rather than guessing or inventing facts. Do not "
    "use markdown bold, headers, or emoji.\n\nVERIFIED DATA:\n{facts}"
)


def _profile_facts(profile):
    """Flatten an assembled profile (curated specs + live NHTSA) into a plain-text
    block to ground the answer - only what we actually have, so the model can't
    speak past our data. The profile analogue of _car_facts()."""
    lines = [f"Vehicle: {profile['year']} {profile['make']} {profile['model']}"]
    specs = profile.get("specs")
    if specs:
        lines.append("\nCurated specs (from our garage):")
        for key in ("engine", "horsepower", "torque", "drivetrain", "transmission",
                    "0_to_60", "fuel_economy", "curb_weight", "reliability",
                    "cost_to_own", "oil_type", "oil_interval"):
            if specs.get(key):
                lines.append(f"- {key.replace('_', ' ').title()}: {specs[key]}")
        for key in ("generations", "common_issues", "maintenance_tips", "popular_mods"):
            value = specs.get(key)
            if not value:
                continue
            lines.append(f"\n{key.replace('_', ' ').title()}:")
            items = value.values() if isinstance(value, dict) else value
            lines.extend(f"- {item}" for item in items)
    else:
        lines.append("\n(No curated spec sheet for this exact car - answer from the "
                     "NHTSA data below, and say specs aren't on file if asked for them.)")
    rel = profile.get("reliability") or {}
    lines.append(
        f"\nNHTSA reliability signal: {rel.get('label', 'n/a')} - "
        f"{rel.get('recalls', 0)} recalls, {rel.get('complaints', 0)} complaints, "
        f"{rel.get('serious', 0)} involving a crash, fire, or injury. {rel.get('caveat', '')}"
    )
    recalls = profile.get("recalls") or []
    if recalls:
        lines.append(f"\nRecalls ({len(recalls)}):")
        for r in recalls[:8]:
            text = (r.get("summary") or "").strip().replace("\n", " ")
            lines.append(f"- {r.get('component') or 'unknown'}: {text[:200]}")
    issues = profile.get("common_issues") or []
    if issues:
        lines.append("\nMost-reported components (by complaint volume):")
        lines.extend(f"- {component}: {count}" for component, count in issues)
    samples = profile.get("complaints") or []
    if samples:
        lines.append("\nSample owner complaint narratives:")
        for c in samples[:6]:
            text = (c.get("summary") or "").strip().replace("\n", " ")
            lines.append(f"- ({c.get('components') or 'unknown'}) {text[:280]}")
    return "\n".join(lines)


def _identify_vehicle(question):
    """Best-guess the catalog car a free-text question is about, or None.

    Scores every catalog entry by how well the question's words overlap its model,
    generation/chassis code, and note. The model must appear for a car to be a
    candidate (so we never resolve on the make alone); a generation token ("mk4",
    "e46") or an explicit year then disambiguates between generations of the same
    model. Ties go to the more specific (longer) model name. Returns None when
    nothing matches, so the caller can ask the visitor to name a car rather than
    answering about one we only guessed at.
    """
    squash = lambda s: re.sub(r"[^a-z0-9]+", "", (s or "").lower())
    words = lambda s: [w for w in re.split(r"[^a-z0-9]+", (s or "").lower()) if len(w) >= 2]
    q_words = set(words(question))
    q_squash = squash(question)
    q_year = re.search(r"\b(19|20)\d{2}\b", question)
    best, best_key = None, (0, 0)
    for entry in catalog:
        model_sq = squash(entry["model"])
        model_words = words(entry["model"])
        distinctive = [w for w in model_words if len(w) >= 5]  # "miata", "supra"
        # A single-word model that's a common English word ("F-Type" -> "type",
        # "IS F" -> "is") would match far too much, so a one-word model only counts
        # if it's distinctive or appears whole; multi-word models match on all words.
        if model_sq and model_sq in q_squash:          # whole model, e.g. "gtr", "mx5miata"
            score = 5
        elif (len(model_words) >= 2 or (model_words and model_words[0] in distinctive)) \
                and all(w in q_words for w in model_words):
            score = 4
        elif any(w in q_words for w in distinctive):    # a distinctive single word
            score = 3
        else:
            continue
        for w in words(entry["generation"]):  # chassis codes: a80, mk4, e46, fl5, nd
            if w in q_words:
                score += 3
        for w in words(entry.get("note")):
            if w in q_words:
                score += 1
        if q_year and str(entry["year"]) == q_year.group(0):
            score += 4
        key = (score, len(model_sq))  # ties -> the longer, more specific model wins
        if key > best_key:
            best, best_key = entry, key
    return best


def _answer_sources(profile):
    """Which data backed the answer, for the 'Based on:' line shown under it."""
    sources = []
    if profile.get("specs"):
        sources.append("Our curated specs")
    if profile.get("recalls") or profile.get("complaints_count"):
        sources.append("NHTSA recalls & complaints")
    return sources


def _stub_answer_for(vehicle, question):
    """Returned when no ANTHROPIC_API_KEY is set, so the homepage works at no cost."""
    name = f"{vehicle['year']} {vehicle['make']} {vehicle['model']}"
    return (
        f"(Demo mode) You asked about the {name}: “{question}”\n\n"
        "With an Anthropic API key set, Garage AI reads this car's curated specs and "
        "live NHTSA data and answers here - grounded in that data, never invented."
    )


def answer_about_vehicle(vehicle, profile, question):
    """One grounded Claude answer about a specific car. Stub without an API key."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _stub_answer_for(vehicle, question)
    import anthropic

    client = anthropic.Anthropic()
    message = client.messages.create(
        model=ASK_MODEL,
        max_tokens=ASK_MAX_TOKENS,
        system=ANSWER_SYSTEM.format(facts=_profile_facts(profile)),
        messages=[{"role": "user", "content": question}],
    )
    return "".join(block.text for block in message.content if block.type == "text").strip()


@app.route("/api/answer", methods=["POST"])
def api_answer():
    question = (request.get_json(silent=True) or {}).get("question", "").strip()
    if not question:
        return jsonify({"error": "Ask a question first."}), 400
    if len(question) > MAX_QUESTION_CHARS:
        return jsonify({"error": "That question is a bit long - keep it under "
                        f"{MAX_QUESTION_CHARS} characters."}), 400
    vehicle = _identify_vehicle(question)
    if not vehicle:
        # No car to ground on -> ask for one instead of guessing (never fabricate).
        return jsonify({
            "vehicle": None,
            "answer": "I answer questions about a specific car in the garage. Name the "
                      "car and I'll dig in - for example “is the Mk4 Supra reliable?” "
                      "or “what tends to break on the E46 M3?”",
            "sources": [],
            "question": question,
        })
    limited = rate_limit_error()  # only a real, answerable question spends the budget
    if limited:
        return jsonify({"error": limited}), 429
    make, model, year = vehicle["make"], vehicle["model"], str(vehicle["year"])
    matches = _curated_for(make, model, year)
    specs = cars[matches[0]] if matches else None
    try:
        profile = build_profile(make, model, year, specs=specs)
        answer = answer_about_vehicle(vehicle, profile, question)
    except Exception as exc:  # surface a friendly message, log the detail
        app.logger.exception("Answer failed for %s", vehicle)
        return jsonify({"error": f"The assistant hit an error: {exc}"}), 502
    return jsonify({
        "vehicle": vehicle,
        "answer": answer,
        "sources": _answer_sources(profile),
        "question": question,
    })


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
# Which curated spec file applies to which catalog generation. Each hand-curated
# JSON in data/cars/ documents ONE specific generation — its top-level specs
# (engine, hp, transmission) are that generation's. So a curated file may only be
# shown for the years that generation covers. The old make+model-substring match
# ignored the year and pasted, e.g., the A90 GR Supra's 382hp B58 specs onto the
# 1997 A80 (2JZ-GTE) page, and even cross-matched "GT" -> the Ford GT supercar.
#
# Each entry: (make, model) -> list of (year_min, year_max, curated_name), matched
# exactly (case-insensitive) against the catalog's own make/model/year. A car gets
# curated specs only when its year falls in a bound generation's range; everything
# else resolves to no specs, so the page shows live NHTSA data rather than another
# generation's numbers. Add a binding here only when a curated file's specs are
# verified for that exact generation. Generations we don't yet have specs for
# (older M3s/Miatas/Civic Si, the Mk6 GTI, the Shelbys, the 2023 Z, ...) stay
# unbound on purpose — see the Task 1 review list in notes/.
CURATED_SPEC_BINDINGS = {
    ("honda", "civic si"):     [(2022, 9999, "Honda Civic Si")],      # 11th-gen FE1
    ("honda", "civic type r"): [(2023, 9999, "Honda Civic Type R")],  # FL5
    ("toyota", "gr86"):        [(2022, 9999, "Toyota GR86")],         # 2nd-gen ZN8
    ("toyota", "gr supra"):    [(2020, 9999, "Toyota GR Supra")],     # A90/A91
    ("toyota", "supra"):       [(1993, 2002, "Toyota Supra Mk4 (A80)")],  # A80 (1989 A70 stays unbound)
    ("nissan", "370z"):        [(2009, 2020, "Nissan 370Z")],         # Z34
    ("nissan", "gt-r"):        [(2007, 9999, "Nissan GT-R (R35)")],   # R35 (Skyline GT-R R32/R34 stay unbound)
    ("bmw", "m3"):             [(2000, 2006, "BMW M3 (E46)")],        # E46 (E30/E36/E92 stay unbound)
    # MX-5 ND: 2016-18 (ND1) made 155hp; the curated file carries the 181hp ND2
    # figure (2019+). Bound for the whole ND run but flagged for review.
    ("mazda", "mx-5 miata"):   [(2016, 9999, "Mazda MX-5 Miata")],    # ND
}


def _curated_for(make, model, year):
    """Curated spec file name(s) whose generation matches this exact car.

    Our hand-curated JSON documents one generation each, so we bind specs by
    (make, model, year-range) via CURATED_SPEC_BINDINGS instead of a loose
    make+model match. Returns [] when we have no curated specs for that
    generation, so the profile falls back to live NHTSA data instead of showing
    another generation's numbers.
    """
    try:
        y = int(str(year)[:4])
    except (TypeError, ValueError):
        return []
    bindings = CURATED_SPEC_BINDINGS.get((make.strip().lower(), model.strip().lower()), [])
    return [name for (lo, hi, name) in bindings if lo <= y <= hi and name in cars]


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
    matches = _curated_for(make, model, year)
    specs = cars[matches[0]] if matches else None
    try:
        profile = build_profile(make, model, year, specs=specs)
    except Exception as exc:  # network/HTTP trouble — surface a friendly message
        app.logger.exception("Profile build failed for %s %s %s", make, model, year)
        return jsonify({"error": f"Could not reach the data service: {exc}"}), 502
    # Tell the page which curated trims we have full detail pages for.
    profile["curated_trims"] = matches
    profile["specs_name"] = matches[0] if matches else None
    # Digest the raw complaint narratives into one short readout. Best-effort:
    # if the model call fails, the page still shows the recalls/complaints below.
    try:
        profile["complaints_summary"] = summarize_complaints(make, model, year, profile)
    except Exception:
        app.logger.exception("Complaint summary failed for %s %s %s", make, model, year)
        profile["complaints_summary"] = None
    return jsonify(profile)


@app.route("/models/<path:filename>")
def model_file(filename):
    # 3D models (committed in frontend/public/models), served as-is.
    return send_from_directory(MODELS_DIR, filename)


@app.route("/<path:path>")
def spa_catch_all(path):
    # Serve a real built file (hashed JS/CSS, favicon, etc.) when it exists;
    # otherwise hand back the SPA shell so client routes / refreshes work.
    # Explicit routes (/api/*, /catalog, /car/<name>, …) are matched first by
    # Werkzeug; we still 404 unknown /api paths instead of returning HTML.
    if path.startswith("api/"):
        abort(404)
    candidate = os.path.join(DIST_DIR, path)
    if os.path.isfile(candidate):
        return send_from_directory(DIST_DIR, path)
    return _spa_index()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
