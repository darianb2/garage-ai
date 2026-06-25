"""Schema validation for car data loaded from data/cars/*.json.

Checks that every car has all required fields with the right types. Run as a
script for a standalone report, or call validate_cars() at startup to warn.
"""

SCHEMA = {
    "engine": str,
    "horsepower": int,
    "torque": str,
    "drivetrain": str,
    "transmission": str,
    "0_to_60": str,
    "fuel_economy": str,
    "curb_weight": str,
    "reliability": str,
    "cost_to_own": str,
    "popular_mods": list,
    "oil_type": str,
    "oil_interval": str,
    "generations": dict,
    "common_issues": list,
    "maintenance_tips": list,
}

LIST_FIELDS = ("popular_mods", "common_issues", "maintenance_tips")


def validate_car(name, data):
    """Return a list of human-readable problems with one car's data (empty = valid)."""
    errors = []
    for field, expected_type in SCHEMA.items():
        if field not in data:
            errors.append(f"missing field '{field}'")
            continue
        value = data[field]
        if not isinstance(value, expected_type):
            errors.append(
                f"field '{field}' should be {expected_type.__name__}, got {type(value).__name__}"
            )
            continue
        if field in LIST_FIELDS:
            if not value:
                errors.append(f"field '{field}' is empty")
            elif not all(isinstance(x, str) for x in value):
                errors.append(f"field '{field}' has non-string items")
        elif field == "generations":
            if not value:
                errors.append("field 'generations' is empty")
            elif not all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()):
                errors.append("field 'generations' has non-string keys/values")
    return errors


def validate_cars(cars):
    """Return {name: [errors]} for every car that has problems (empty = all valid)."""
    return {name: errs for name, data in cars.items() if (errs := validate_car(name, data))}


if __name__ == "__main__":
    import sys

    from loader import load_cars

    cars = load_cars()
    problems = validate_cars(cars)
    if not problems:
        print(f"✓ All {len(cars)} cars valid.")
    else:
        for name, errs in problems.items():
            print(f"✗ {name}:")
            for e in errs:
                print(f"    - {e}")
        sys.exit(1)
