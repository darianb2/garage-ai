"""Flask web backend for Garage AI.

Serves the car database (loaded from data/cars/*.json) over HTTP.
Run locally:  ./.venv/bin/python app.py   then open http://localhost:5000

Endpoints:
  GET /                  health/info
  GET /api/cars          list of car summaries (name, engine, hp, drivetrain)
  GET /api/car/<name>    full data for one car (exact, case-insensitive)
  GET /api/search?q=...  fuzzy search → list of summaries
"""

from flask import Flask, jsonify, request

from loader import load_cars
from search import find_matches

app = Flask(__name__)
cars = load_cars()


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
    return jsonify({"app": "Garage AI", "car_count": len(cars)})


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
