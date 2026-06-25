"""Loads car data from individual JSON files in data/cars/.

Each file is a flat dict containing a "name" key (the display name) plus all
the car's data fields. Files are numbered (NN-slug.json) so sorting filenames
preserves the curated order.
"""

import glob
import json
import os

CARS_DIR = os.path.join(os.path.dirname(__file__), "data", "cars")


def load_cars():
    """Return an ordered dict of {display_name: car_data} from data/cars/*.json."""
    cars = {}
    for path in sorted(glob.glob(os.path.join(CARS_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        name = data.pop("name")
        cars[name] = data
    return cars
