import re

from loader import load_cars
from validator import validate_cars

print("Welcome to Garage AI")

cars = load_cars()
_problems = validate_cars(cars)
if _problems:
    print("\n⚠ Data validation warnings:")
    for _name, _errs in _problems.items():
        for _err in _errs:
            print(f"  - {_name}: {_err}")


def display_car(name, car):
    print(f"\n{'=' * 40}")
    print(f"  {name}")
    print(f"{'=' * 40}")
    print(f"  Engine:       {car['engine']}")
    print(f"  Horsepower:   {car['horsepower']} hp")
    print(f"  Torque:       {car['torque']}")
    print(f"  Drivetrain:   {car['drivetrain']}")
    print(f"  Transmission: {car['transmission']}")
    print(f"  0-60 mph:     {car['0_to_60']}")
    print(f"  Fuel Economy: {car['fuel_economy']}")
    print(f"  Curb Weight:  {car['curb_weight']}")
    print(f"  Reliability:  {car['reliability']}")
    print(f"  Cost to Own:  {car['cost_to_own']}")
    print(f"\n  Oil Type:     {car['oil_type']}")
    print(f"  Oil Interval: {car['oil_interval']}")
    print(f"\n  Generation History:")
    for gen, notes in car["generations"].items():
        print(f"    {gen}")
        print(f"      {notes}")
    print(f"\n  Common Issues:")
    for issue in car["common_issues"]:
        print(f"    - {issue}")
    print(f"\n  Maintenance Tips:")
    for tip in car["maintenance_tips"]:
        print(f"    - {tip}")
    print(f"\n  Popular Mods:")
    for mod in car["popular_mods"]:
        print(f"    - {mod}")


def find_matches(query, cars):
    """Return matching car names: exact (case-insensitive) wins, else substring matches."""
    q = query.strip().lower()
    if not q:
        return []
    for name in cars:
        if name.lower() == q:
            return [name]
    return [name for name in cars if q in name.lower()]


def list_cars(cars):
    print(f"\nI have data on {len(cars)} cars:")
    for name in cars:
        print(f"  - {name}")


def parse_comparison(query):
    """Split 'A vs B' / 'A versus B' / 'A, B' into two parts; return None if not a comparison."""
    parts = re.split(r"\s+vs\.?\s+|\s+versus\s+|\s*,\s*", query.strip(), flags=re.IGNORECASE)
    parts = [p for p in parts if p]
    return parts if len(parts) == 2 else None


def compare_cars(name1, car1, name2, car2):
    print(f"\n{'=' * 50}")
    print(f"  {name1}  vs  {name2}")
    print(f"{'=' * 50}")
    fields = [
        ("Engine", "engine"),
        ("Horsepower", "horsepower"),
        ("Torque", "torque"),
        ("Drivetrain", "drivetrain"),
        ("Transmission", "transmission"),
        ("0-60 mph", "0_to_60"),
        ("Fuel Economy", "fuel_economy"),
        ("Curb Weight", "curb_weight"),
        ("Reliability", "reliability"),
        ("Cost to Own", "cost_to_own"),
        ("Oil Type", "oil_type"),
    ]
    pad = max(len(name1), len(name2))
    for label, key in fields:
        v1, v2 = car1[key], car2[key]
        if key == "horsepower":
            v1, v2 = f"{v1} hp", f"{v2} hp"
        print(f"\n  {label}:")
        print(f"    {name1:<{pad}}  {v1}")
        print(f"    {name2:<{pad}}  {v2}")


def resolve_one(query, cars):
    """Resolve a query to a single car name, or print why it couldn't and return None."""
    matches = find_matches(query, cars)
    if len(matches) == 1:
        return matches[0]
    if not matches:
        print(f"\nNo match for '{query.strip()}'.")
    else:
        print(f"\n'{query.strip()}' is ambiguous: {', '.join(matches)}")
    return None


def parse_filter(query):
    """Return ('drivetrain', VALUE) or ('hp', op, number), else None."""
    q = re.sub(r"^filter\s+", "", query.strip().lower())
    if q in ("fwd", "rwd", "awd"):
        return ("drivetrain", q.upper())
    m = re.search(r"(>=|<=|>|<)\s*(\d+)", q)
    if m:
        return ("hp", m.group(1), int(m.group(2)))
    m = re.search(r"(\d+)\s*\+", q)
    if m:
        return ("hp", ">=", int(m.group(1)))
    m = re.search(r"\bover\s+(\d+)", q)
    if m:
        return ("hp", ">", int(m.group(1)))
    m = re.search(r"\bunder\s+(\d+)", q)
    if m:
        return ("hp", "<", int(m.group(1)))
    return None


def show_filter(spec, cars):
    if spec[0] == "drivetrain":
        target = spec[1]
        results = [(n, cars[n]["drivetrain"]) for n in cars if target in cars[n]["drivetrain"].upper()]
        print(f"\nCars with {target} drivetrain ({len(results)}):")
        for name, dt in results:
            print(f"  - {name}  ({dt})")
    else:
        op, num = spec[1], spec[2]
        ops = {">": lambda a, b: a > b, "<": lambda a, b: a < b,
               ">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b}
        cmp = ops[op]
        results = sorted(
            [(n, cars[n]["horsepower"]) for n in cars if cmp(cars[n]["horsepower"], num)],
            key=lambda x: -x[1],
        )
        print(f"\nCars with horsepower {op} {num} ({len(results)}):")
        for name, hp in results:
            print(f"  - {name}  ({hp} hp)")
    if not results:
        print("  (no cars match)")


list_cars(cars)
choice = input("\nWhat car are you researching? (a name, 'A vs B', or a filter like 'awd' / 'over 400 hp') ")

comparison = parse_comparison(choice)
filter_spec = None if comparison else parse_filter(choice)

if comparison:
    n1 = resolve_one(comparison[0], cars)
    n2 = resolve_one(comparison[1], cars)
    if n1 and n2:
        compare_cars(n1, cars[n1], n2, cars[n2])
elif filter_spec:
    show_filter(filter_spec, cars)
else:
    matches = find_matches(choice, cars)
    if not matches:
        print(f"\nI don't have data on '{choice.strip()}' yet.")
    elif len(matches) == 1:
        display_car(matches[0], cars[matches[0]])
    else:
        print(f"\nFound {len(matches)} matches for '{choice.strip()}':")
        for name in matches:
            print(f"  - {name}")
        print("\nType the full name to see full details on one.")
