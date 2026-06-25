"""Shared car-name matching used by both the CLI (main.py) and the web API (app.py)."""


def find_matches(query, cars):
    """Return matching car names: exact (case-insensitive) wins, else substring matches."""
    q = query.strip().lower()
    if not q:
        return []
    for name in cars:
        if name.lower() == q:
            return [name]
    return [name for name in cars if q in name.lower()]
