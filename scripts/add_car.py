#!/usr/bin/env python3
"""Interactive helper to add a new car to data/cars/.

Prompts for each field, validates the result against the schema, and writes a
correctly-numbered JSON file. Run from anywhere:  python3 scripts/add_car.py
"""

import glob
import json
import os
import re
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from validator import validate_car  # noqa: E402

CARS_DIR = os.path.join(PROJECT_ROOT, "data", "cars")

SCALAR_PROMPTS = {
    "engine": "Engine (e.g. '2.0L turbo I4 (EA888)')",
    "horsepower": "Horsepower (whole number)",
    "torque": "Torque (e.g. '295 lb-ft')",
    "drivetrain": "Drivetrain (FWD / RWD / AWD)",
    "transmission": "Transmission",
    "0_to_60": "0-60 mph (e.g. '5.6 sec')",
    "fuel_economy": "Fuel economy (e.g. '24 city / 33 hwy mpg')",
    "curb_weight": "Curb weight (e.g. '3,150 lbs')",
    "reliability": "Reliability (e.g. '7/10 — reasoning')",
    "cost_to_own": "Cost to own (insurance tier + maintenance/yr)",
    "oil_type": "Oil type",
    "oil_interval": "Oil change interval",
}

LIST_PROMPTS = {
    "popular_mods": "Popular mods",
    "common_issues": "Common issues",
    "maintenance_tips": "Maintenance tips",
}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def next_index():
    nums = []
    for path in glob.glob(os.path.join(CARS_DIR, "*.json")):
        m = re.match(r"(\d+)-", os.path.basename(path))
        if m:
            nums.append(int(m.group(1)))
    return max(nums, default=0) + 1


def existing_slugs():
    slugs = set()
    for path in glob.glob(os.path.join(CARS_DIR, "*.json")):
        m = re.match(r"\d+-(.+)\.json$", os.path.basename(path))
        if m:
            slugs.add(m.group(1))
    return slugs


def prompt_list(label):
    print(f"\n{label} — enter one per line, blank line to finish:")
    items = []
    while True:
        line = input("  - ").strip()
        if not line:
            break
        items.append(line)
    return items


def prompt_generations():
    print("\nGenerations — enter 'label: description', blank line to finish:")
    gens = {}
    while True:
        line = input("  ").strip()
        if not line:
            break
        if ":" not in line:
            print("    (use 'label: description')")
            continue
        label, desc = line.split(":", 1)
        gens[label.strip()] = desc.strip()
    return gens


def main():
    print("== Add a car to Garage AI ==")
    name = input("\nDisplay name (e.g. 'Subaru BRZ'): ").strip()
    if not name:
        print("No name given — aborting.")
        return
    if slug(name) in existing_slugs():
        print(f"A car with slug '{slug(name)}' already exists — aborting.")
        return

    record = {"name": name}
    for field, label in SCALAR_PROMPTS.items():
        value = input(f"{label}: ").strip()
        if field == "horsepower":
            try:
                value = int(value)
            except ValueError:
                print("  Horsepower must be a whole number — aborting.")
                return
        record[field] = value

    record["generations"] = prompt_generations()
    for field, label in LIST_PROMPTS.items():
        record[field] = prompt_list(label)

    errors = validate_car(name, record)
    if errors:
        print("\n✗ Validation failed — nothing written:")
        for e in errors:
            print(f"    - {e}")
        return

    filename = f"{next_index():02d}-{slug(name)}.json"
    path = os.path.join(CARS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Wrote {os.path.relpath(path, PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
