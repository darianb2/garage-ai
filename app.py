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
from datetime import datetime, timezone

from flask import Flask, jsonify, redirect, render_template, request, url_for

from loader import load_cars
from search import find_matches

app = Flask(__name__)
cars = load_cars()

# Runtime-only log (gitignored; ephemeral on hosts like Railway/Heroku).
SUGGESTIONS_FILE = os.path.join(os.path.dirname(__file__), "data", "suggestions.log")


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
            return render_template("car.html", name=car_name, car=cars[car_name])
    return ("Car not found", 404)


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
