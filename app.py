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
from datetime import datetime, timezone

from flask import Flask, jsonify, redirect, render_template, request, url_for

from loader import load_cars
from search import find_matches

app = Flask(__name__)
cars = load_cars()

# --- AI research assistant ("Ask about this car") --------------------------
# Grounded Q&A: the car's verified JSON is the factual backbone; Claude adds the
# real-world owner wisdom spec sites scatter across forums. Single Messages API
# call (not an agent) — the simplest, cheapest tier that fits.
ASK_MODEL = "claude-opus-4-8"
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
        max_tokens=1024,
        system=SYSTEM_TEMPLATE.format(facts=_car_facts(name, car)),
        messages=[{"role": "user", "content": question}],
    )
    return "".join(block.text for block in message.content if block.type == "text")

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
