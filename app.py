"""Flask web backend for Garage AI.

Serves the car database (loaded from data/cars/*.json) over HTTP.
Run locally:  ./.venv/bin/python app.py   then open http://localhost:5000
API endpoints are added in Phase 3.2.
"""

from flask import Flask, jsonify

from loader import load_cars

app = Flask(__name__)
cars = load_cars()


@app.route("/")
def index():
    return jsonify({"app": "Garage AI", "car_count": len(cars)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
